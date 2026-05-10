import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { User } from '../models/user';

const BCRYPT_ROUNDS = 12;

const signupSchema = {
  body: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8, maxLength: 128 },
    },
  },
} as const;

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: { email: string; password: string } }>(
    '/auth/signup',
    { schema: signupSchema },
    async (request, reply) => {
      const { email, password } = request.body;
      const existing = await User.findOne({ email });
      if (existing) {
        return reply.status(409).send({ error: 'Email already registered' });
      }
      const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const user = await User.create({ email, password_hash });
      const token = fastify.jwt.sign({ sub: user._id.toString(), email: user.email });
      return reply.status(201).send({ token });
    }
  );

  fastify.post<{ Body: { email: string; password: string } }>(
    '/auth/login',
    { schema: signupSchema },
    async (request, reply) => {
      const { email, password } = request.body;
      const user = await User.findOne({ email });
      if (!user) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }
      const token = fastify.jwt.sign({ sub: user._id.toString(), email: user.email });
      return reply.send({ token });
    }
  );
}
