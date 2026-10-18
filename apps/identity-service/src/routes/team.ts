import type { FastifyPluginAsync } from 'fastify'
import { hash } from 'bcryptjs'
import { isDuplicateKeyError } from '../lib/db.js'
import { User, type UserDoc } from '../models/index.js'
import type { ClinicRole } from '../lib/permissions.js'
import { requireRequester } from '../lib/requester.js'
import {
  byRoleThenName,
  countActiveAdmins,
  normalizeEmail,
  serializeTeamMember,
} from '../lib/users.js'

interface CreateMemberBody {
  name: string
  email: string
  password: string
  role: ClinicRole
  isVeterinarian?: boolean
}

interface UpdateMemberBody {
  name?: string
  email?: string
  password?: string
  role?: ClinicRole
  isActive?: boolean
  isVeterinarian?: boolean
}

interface UserParams {
  userId: string
}

const roleSchema = { type: 'string', enum: ['ADMIN', 'VETERINARIAN', 'STAFF'] }
const userParamsSchema = {
  type: 'object',
  required: ['userId'],
  properties: { userId: { type: 'string', minLength: 36, maxLength: 36 } },
}


export const teamRoutes: FastifyPluginAsync = async (app) => {
  app.get('/team', async (request, reply) => {
    if (!requireRequester(request, reply, 'manageTeam')) return

    const users = await User.find().lean()
    return users.sort(byRoleThenName).map(serializeTeamMember)
  })

  app.post<{ Body: CreateMemberBody }>(
    '/team',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'email', 'password', 'role'],
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 160 },
            email: { type: 'string', format: 'email', maxLength: 255 },
            password: { type: 'string', minLength: 12, maxLength: 128 },
            role: roleSchema,
            isVeterinarian: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      if (!requireRequester(request, reply, 'manageTeam')) return
      const body = request.body

      try {
        const user = await User.create({
          name: body.name.trim(),
          email: normalizeEmail(body.email),
          passwordHash: await hash(body.password, 12),
          role: body.role,
          isVeterinarian: body.role === 'ADMIN' && (body.isVeterinarian ?? false),
        })
        return reply.status(201).send(serializeTeamMember(user.toObject()))
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          return reply
            .status(409)
            .send({ message: 'A user with this email already exists.' })
        }
        throw error
      }
    },
  )

  app.patch<{ Params: UserParams; Body: UpdateMemberBody }>(
    '/team/:userId',
    {
      schema: {
        params: userParamsSchema,
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 160 },
            email: { type: 'string', format: 'email', maxLength: 255 },
            password: { type: 'string', minLength: 12, maxLength: 128 },
            role: roleSchema,
            isActive: { type: 'boolean' },
            isVeterinarian: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const requester = requireRequester(request, reply, 'manageTeam')
      if (!requester) return

      const target = await User.findById(request.params.userId).lean()
      if (!target) return reply.status(404).send({ message: 'User not found' })

      const body = request.body
      const isSelf = target._id === requester.userId

      if (isSelf && body.role !== undefined && body.role !== target.role) {
        return reply
          .status(400)
          .send({ message: 'You cannot change your own role.' })
      }
      if (isSelf && body.isActive === false) {
        return reply
          .status(400)
          .send({ message: 'You cannot deactivate your own account.' })
      }
      if (isSelf && body.password !== undefined) {
        return reply
          .status(400)
          .send({ message: 'Change your own password from My account.' })
      }

      const losesAdminAccess =
        target.role === 'ADMIN' &&
        target.isActive &&
        ((body.role !== undefined && body.role !== 'ADMIN') ||
          body.isActive === false)
      if (losesAdminAccess && (await countActiveAdmins(target._id)) === 0) {
        return reply
          .status(400)
          .send({ message: 'The clinic needs at least one active admin.' })
      }

      const nextRole = body.role ?? target.role
      try {
        const changes: Partial<UserDoc> = {
          ...(body.name !== undefined && { name: body.name.trim() }),
          ...(body.email !== undefined && { email: normalizeEmail(body.email) }),
          ...(body.role !== undefined && { role: body.role }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
          ...(body.isVeterinarian !== undefined && {
            // Only admins carry a separate "also a vet" flag.
            isVeterinarian: nextRole === 'ADMIN' && body.isVeterinarian,
          }),
          ...(body.password !== undefined && {
            passwordHash: await hash(body.password, 12),
          }),
        }
        const user = await User.findByIdAndUpdate(
          target._id,
          {
            $set: changes,
            // A new password signs the person out everywhere.
            ...(body.password !== undefined && { $inc: { sessionVersion: 1 } }),
          },
          { new: true, runValidators: true },
        ).lean()
        if (!user) return reply.status(404).send({ message: 'User not found' })
        return serializeTeamMember(user)
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          return reply
            .status(409)
            .send({ message: 'A user with this email already exists.' })
        }
        throw error
      }
    },
  )

  app.delete<{ Params: UserParams }>(
    '/team/:userId',
    { schema: { params: userParamsSchema } },
    async (request, reply) => {
      const requester = requireRequester(request, reply, 'manageTeam')
      if (!requester) return

      const target = await User.findById(request.params.userId).lean()
      if (!target) return reply.status(404).send({ message: 'User not found' })

      if (target._id === requester.userId) {
        return reply
          .status(400)
          .send({ message: 'You cannot delete your own account.' })
      }
      if (
        target.role === 'ADMIN' &&
        target.isActive &&
        (await countActiveAdmins(target._id)) === 0
      ) {
        return reply
          .status(400)
          .send({ message: 'The clinic needs at least one active admin.' })
      }

      await User.deleteOne({ _id: target._id })
      return reply.status(204).send()
    },
  )
}
