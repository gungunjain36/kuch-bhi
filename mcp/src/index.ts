import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import { z } from 'zod'
import { GoogleHandler } from './google-handler'

// Context from the auth process, encrypted & stored in the auth token
// and provided to the MyMCP as this.props
type Props = {
  name: string
  email: string
  accessToken: string
}

export class MyMCP extends McpAgent<Env, Record<string, never>, Props> {
  declare props: Props
  declare env: Env
  server = new McpServer({
    name: 'KuchBhi Google Workspace MCP',
    version: '0.1.0',
  })

  async init() {
    // Simple validate tool
    this.server.tool('validate', 'Validate this KuchBhi MCP server is reachable', {}, async () => {
      const phone = this.env?.PHONE_NUMBER ?? 'PHONE_NUMBER not set'
      return { content: [{ text: String(phone), type: 'text' }] }
    })

    // Gmail: send email
    this.server.tool(
      'send_gmail',
      {
        to: z.string().email(),
        subject: z.string(),
        body: z.string(),
      },
      async ({ to, subject, body }) => {
        if (!this.props.accessToken) {
          return {
            content: [
              {
                text: 'No Google access token found. Please authenticate with Google first.',
                type: 'text',
              },
            ],
          }
        }

        const gmailSendUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
        const message = [`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset="UTF-8"', '', body].join('\r\n')

        const base64Encoded = btoa(unescape(encodeURIComponent(message)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')

        const response = await fetch(gmailSendUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.props.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            raw: base64Encoded,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          return {
            content: [
              {
                text: `Failed to send email: ${errorText}`,
                type: 'text',
              },
            ],
          }
        }

        return {
          content: [
            {
              text: `Email sent to ${to} successfully!`,
              type: 'text',
            },
          ],
        }
      },
    )

    // Drive: list files
    this.server.tool(
      'drive_list_files',
      {
        q: z.string().optional().describe('Drive search query, e.g., name contains "Report"'),
        pageSize: z.number().int().min(1).max(1000).optional().default(50),
        fields: z
          .string()
          .optional()
          .default('files(id,name,mimeType,modifiedTime,owners(displayName,emailAddress)),nextPageToken'),
        pageToken: z.string().optional(),
      },
      async ({ q, pageSize, fields, pageToken }) => {
        if (!this.props.accessToken) {
          return { content: [{ type: 'text', text: 'Authenticate with Google first.' }] }
        }
        const url = new URL('https://www.googleapis.com/drive/v3/files')
        if (q) url.searchParams.set('q', q)
        if (pageSize) url.searchParams.set('pageSize', String(pageSize))
        if (fields) url.searchParams.set('fields', fields)
        if (pageToken) url.searchParams.set('pageToken', pageToken)
        // helpful defaults
        url.searchParams.set('spaces', 'drive')
        url.searchParams.set('orderBy', 'modifiedTime desc')
        const resp = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${this.props.accessToken}` },
        })
        const text = await resp.text()
        if (!resp.ok) {
          return { content: [{ type: 'text', text: `Drive list failed: ${text}` }] }
        }
        return { content: [{ type: 'text', text }] }
      },
    )

    // Docs: create document
    this.server.tool(
      'docs_create',
      { title: z.string().describe('Document title') },
      async ({ title }) => {
        if (!this.props.accessToken) {
          return { content: [{ type: 'text', text: 'Authenticate with Google first.' }] }
        }
        const resp = await fetch('https://docs.googleapis.com/v1/documents', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.props.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title }),
        })
        const text = await resp.text()
        if (!resp.ok) return { content: [{ type: 'text', text: `Docs create failed: ${text}` }] }
        return { content: [{ type: 'text', text }] }
      },
    )

    // Docs: append text
    this.server.tool(
      'docs_append_text',
      { docId: z.string(), text: z.string() },
      async ({ docId, text }) => {
        if (!this.props.accessToken) {
          return { content: [{ type: 'text', text: 'Authenticate with Google first.' }] }
        }
        const url = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}:batchUpdate`
        const requests = [
          {
            insertText: {
              text: text,
              endOfSegmentLocation: {},
            },
          },
        ]
        const resp = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.props.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
        })
        const bodyText = await resp.text()
        if (!resp.ok) return { content: [{ type: 'text', text: `Docs append failed: ${bodyText}` }] }
        return { content: [{ type: 'text', text: bodyText }] }
      },
    )

    // Docs: get document
    this.server.tool(
      'docs_get',
      { docId: z.string() },
      async ({ docId }) => {
        if (!this.props.accessToken) {
          return { content: [{ type: 'text', text: 'Authenticate with Google first.' }] }
        }
        const url = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}`
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${this.props.accessToken}` } })
        const text = await resp.text()
        if (!resp.ok) return { content: [{ type: 'text', text: `Docs get failed: ${text}` }] }
        return { content: [{ type: 'text', text }] }
      },
    )

    // Sheets: create spreadsheet
    this.server.tool(
      'sheets_create',
      { title: z.string().describe('Spreadsheet title') },
      async ({ title }) => {
        if (!this.props.accessToken) {
          return { content: [{ type: 'text', text: 'Authenticate with Google first.' }] }
        }
        const resp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.props.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ properties: { title } }),
        })
        const text = await resp.text()
        if (!resp.ok) return { content: [{ type: 'text', text: `Sheets create failed: ${text}` }] }
        return { content: [{ type: 'text', text }] }
      },
    )

    // Sheets: append values
    this.server.tool(
      'sheets_append_values',
      {
        spreadsheetId: z.string(),
        range: z.string().describe('A1 notation, e.g., Sheet1!A1'),
        values: z.array(z.array(z.union([z.string(), z.number(), z.boolean()]))).describe('2D array of cell values'),
        valueInputOption: z.enum(['RAW', 'USER_ENTERED']).default('USER_ENTERED').optional(),
      },
      async ({ spreadsheetId, range, values, valueInputOption = 'USER_ENTERED' }) => {
        if (!this.props.accessToken) {
          return { content: [{ type: 'text', text: 'Authenticate with Google first.' }] }
        }
        const url = new URL(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
            range,
          )}:append`,
        )
        url.searchParams.set('valueInputOption', valueInputOption)
        const resp = await fetch(url.toString(), {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.props.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values }),
        })
        const text = await resp.text()
        if (!resp.ok) return { content: [{ type: 'text', text: `Sheets append failed: ${text}` }] }
        return { content: [{ type: 'text', text }] }
      },
    )

    // Sheets: get values
    this.server.tool(
      'sheets_get_values',
      { spreadsheetId: z.string(), range: z.string() },
      async ({ spreadsheetId, range }) => {
        if (!this.props.accessToken) {
          return { content: [{ type: 'text', text: 'Authenticate with Google first.' }] }
        }
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
          spreadsheetId,
        )}/values/${encodeURIComponent(range)}`
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${this.props.accessToken}` } })
        const text = await resp.text()
        if (!resp.ok) return { content: [{ type: 'text', text: `Sheets get values failed: ${text}` }] }
        return { content: [{ type: 'text', text }] }
      },
    )
  }
}

export default new OAuthProvider({
  apiHandler: (MyMCP as any).mount('/sse') as any,
  apiRoute: '/sse',
  authorizeEndpoint: '/authorize',
  clientRegistrationEndpoint: '/register',
  defaultHandler: GoogleHandler as any,
  tokenEndpoint: '/token',
})
