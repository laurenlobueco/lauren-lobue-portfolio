import express from 'express'
import morgan from 'morgan'
import { z } from 'zod'
import 'dotenv/config'
import formData from 'form-data'
import Mailgun from 'mailgun.js'

// Configure Mailgun so the server can send emails.
// The key, domain, and recipient come from api/.env (never commit that file).
const mailgun = new Mailgun(formData)
const mailgunClient = mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY })

const app = express()

// Morgan logs every request in the terminal (handy for debugging)
app.use(morgan('dev'))

// Parse JSON request bodies
app.use(express.json())

const indexRoute = express.Router()

// Health check: visit /api in the browser to see if the server is up
const getRouteHandler = (request, response) => {
  response.header('Access-Control-Allow-Origin', '*')
  return response.json('this thing is on')
}

// Strips HTML tags as a basic guard before the text reaches the email
const stripTags = val => val.replace(/<[^>]*>/g, '')

// Backend rules match the frontend, plus trimming and tag stripping
const schema = z.object({
  name: z.string({ required_error: 'name is a required field' })
    .trim()
    .min(1, { message: 'name must consist of at least one character' })
    .max(64, { message: 'name cannot be greater than 64 characters' })
    .transform(stripTags),
  email: z.string({ required_error: 'email is a required field' })
    .trim()
    .email({ message: 'invalid email address' })
    .max(128, { message: 'email must be less than 128 characters' })
    .transform(stripTags),
  subject: z.string()
    .trim()
    .max(64, { message: 'company / project must be less than 64 characters' })
    .transform(stripTags)
    .optional(),
  message: z.string({ required_error: 'message is a required field' })
    .trim()
    .min(1, { message: 'message must be at least 1 character' })
    .max(500, { message: 'message cannot be greater than 500 characters' })
    .transform(stripTags)
})

const postRouteHandler = async (request, response) => {
  response.header('Access-Control-Allow-Origin', '*')

  const result = schema.safeParse(request.body)

  if (result.error) {
    return response.json({ status: 418, message: result.error.issues[0].message })
  }

  // If the hidden honeypot field was filled in, a bot sent this.
  // Send a fake success message and don't email anything.
  if (request.body.website) {
    return response.json({ status: 201, message: 'email sent successfully' })
  }

  try {
    const { name, email, subject, message } = result.data

    const mailgunMessage = {
      // Mailgun requires the "from" address to be on the sending domain,
      // so the visitor's email goes in the body and the Reply-To header
      from: `${name} <postmaster@${process.env.MAILGUN_DOMAIN}>`,
      to: process.env.MAILGUN_RECIPIENT,
      subject: subject ? `Portfolio inquiry: ${subject}` : 'Portfolio inquiry',
      'h:Reply-To': email,
      text: `From: ${name} (${email})\nCompany / Project: ${subject ?? 'n/a'}\n\n${message}\n`
    }

    await mailgunClient.messages.create(process.env.MAILGUN_DOMAIN, mailgunMessage)
    return response.json({ status: 200, message: 'Thanks! Your message was sent. I\'ll be in touch soon.' })

  } catch (error) {
    console.error(error)
    return response.json({ status: 500, message: 'internal server error, try again later' })
  }
}

indexRoute.route('/')
  .get(getRouteHandler)
  .post(postRouteHandler)

app.use('/api', indexRoute)

app.listen(4200, () => {
  console.log('server is running on port 4200')
})
