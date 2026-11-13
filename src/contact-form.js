import { z } from 'zod'

// Contact form: checks the fields in the browser (Zod), then sends them
// to the Express backend in /api, which emails them through Mailgun.
export function contactForm() {

    const form = document.getElementById('contact-form')
    if (!form) return

    // Validation rules (the backend checks the same rules again)
    // "subject" is the Company / Project field and is optional
    const schema = z.object({
        name: z.string({ required_error: 'name is a required field' })
            .min(1, { message: 'name must consist of at least one character' })
            .max(64, { message: 'name cannot be greater than 64 characters' }),
        email: z.string({ required_error: 'email is a required field' })
            .email({ message: 'invalid email address' })
            .max(128, { message: 'email must be less than 128 characters' }),
        subject: z.string()
            .max(64, { message: 'company / project must be less than 64 characters' })
            .optional(),
        message: z.string({ required_error: 'message is a required field' })
            .min(1, { message: 'message must be at least 1 character' })
            .max(500, { message: 'message cannot be greater than 500 characters' })
    })

    // Each field, paired with the <p> that shows its error message
    const fields = {
        name: { input: document.getElementById('name'), error: document.getElementById('nameError') },
        email: { input: document.getElementById('email'), error: document.getElementById('emailError') },
        subject: { input: document.getElementById('subject'), error: document.getElementById('subjectError') },
        message: { input: document.getElementById('message'), error: document.getElementById('messageError') }
    }

    const statusOutput = document.getElementById('status')
    const submitButton = form.querySelector('button[type="submit"]')

    const successClasses = ['text-green-800', 'bg-green-50']
    const errorClasses = ['text-red-800', 'bg-red-50']

    // Show a green (success) or red (error) message under the button
    function showStatus(message, isSuccess) {
        statusOutput.textContent = message
        statusOutput.classList.remove('hidden', ...successClasses, ...errorClasses)
        statusOutput.classList.add(...(isSuccess ? successClasses : errorClasses))
    }

    form.addEventListener('submit', async event => {
        event.preventDefault()

        const formData = new FormData(form)

        // Clear errors from the last attempt
        statusOutput.classList.add('hidden')
        Object.values(fields).forEach(({ input, error }) => {
            error.classList.add('hidden')
            input.classList.remove('border-red-500')
            input.removeAttribute('aria-invalid')
        })

        // Honeypot: real visitors never see the "website" field, so if it
        // has a value a bot filled it in. Pretend it worked and stop.
        if (formData.get('website') !== '') {
            form.reset()
            showStatus('message sent successfully', true)
            return
        }

        const values = Object.fromEntries(formData.entries())

        // An empty optional field comes through as "", which Zod's
        // .optional() would still check, so turn it into undefined
        values.subject = values.subject === '' ? undefined : values.subject

        const result = schema.safeParse(values)

        if (result.success === false) {
            result.error.errors.forEach(issue => {
                const field = fields[issue.path[0]]
                if (!field) return
                field.error.textContent = issue.message
                field.error.classList.remove('hidden')
                field.input.classList.add('border-red-500')
                field.input.setAttribute('aria-invalid', 'true')
            })
            return
        }

        // Stop double submissions while the email is sending
        submitButton.disabled = true

        try {
            // Relative URL: in development Vite forwards /api to localhost:4200
            // (vite.config.js); on the live site nginx forwards it to the API
            const response = await fetch('/api', {
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            })
            const data = await response.json()

            if (data.status === 200) {
                showStatus(data.message, true)
                form.reset()
            } else {
                showStatus(data.message, false)
            }
        } catch (error) {
            console.error(error)
            showStatus('Something went wrong sending your message. Please try again later.', false)
        } finally {
            submitButton.disabled = false
        }
    })
}
