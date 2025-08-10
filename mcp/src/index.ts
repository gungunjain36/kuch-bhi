import OAuthProvider from '@cloudflare/workers-oauth-provider'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import { z } from 'zod'
import { GoogleHandler } from './google-handler'
import { refreshUpstreamAccessToken, type TokenResponse, type Props } from './utils'

// Props are defined in utils.ts and provided to the MyMCP as this.props

export class MyMCP extends McpAgent<Env, Record<string, never>, Props> {
  declare props: Props
  declare env: Env
  // Per-connection ephemeral state for chaining tools
  private lastDocId?: string
  server = new McpServer({
    name: 'KuchBhi Google Workspace MCP',
    version: '0.1.0',
  })

  async init() {
    const REAUTH_HELP =
      'Authorization missing or expired. In your MCP client, disconnect and reconnect this provider to re-authorize. If needed, open https://kuchbhi-google-workspace-mcp.gandhi-mardav.workers.dev from the client to start the flow.'

    const tryRefresh = async (): Promise<boolean> => {
      if (!this.props.refreshToken) return false
      const [refreshed, err] = await refreshUpstreamAccessToken({
        clientId: this.env.GOOGLE_CLIENT_ID,
        clientSecret: this.env.GOOGLE_CLIENT_SECRET,
        refreshToken: this.props.refreshToken,
        upstreamUrl: 'https://accounts.google.com/o/oauth2/token',
      })
      if (err || !refreshed?.access_token) return false
      this.props.accessToken = refreshed.access_token
      return true
    }
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
          return { content: [{ type: 'text', text: REAUTH_HELP }] }
        }

        const gmailSendUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
        const message = [`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset="UTF-8"', '', body].join('\r\n')

        const base64Encoded = btoa(unescape(encodeURIComponent(message)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')

        let response = await fetch(gmailSendUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.props.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            raw: base64Encoded,
          }),
        })
        if ((response.status === 401 || response.status === 403) && (await tryRefresh())) {
          response = await fetch(gmailSendUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.props.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw: base64Encoded }),
          })
        }
        if (!response.ok) {
          const errorText = await response.text()
          return {
            content: [
              {
                text: `${response.status === 401 || response.status === 403 ? REAUTH_HELP + ' ' : ''}Failed to send email: ${errorText}`,
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

    // Gmail: search messages
    this.server.tool(
      'gmail_search_messages',
      {
        query: z
          .string()
          .describe(
            'Gmail search query (e.g., from:"Wells Fargo" OR subject:"Wells Fargo" newer_than:1y). Uses Gmail search syntax.',
          ),
        maxResults: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(25),
        includeSpamTrash: z.boolean().optional().default(false),
        pageToken: z.string().optional(),
      },
      async ({ query, maxResults = 25, includeSpamTrash = false, pageToken }) => {
        if (!this.props.accessToken) {
          return { content: [{ type: 'text', text: REAUTH_HELP }] }
        }

        const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
        if (query) listUrl.searchParams.set('q', query)
        if (maxResults) listUrl.searchParams.set('maxResults', String(maxResults))
        if (includeSpamTrash) listUrl.searchParams.set('includeSpamTrash', 'true')
        if (pageToken) listUrl.searchParams.set('pageToken', pageToken)

        let listResp = await fetch(listUrl.toString(), { headers: { Authorization: `Bearer ${this.props.accessToken}` } })
        if ((listResp.status === 401 || listResp.status === 403) && (await tryRefresh())) {
          listResp = await fetch(listUrl.toString(), { headers: { Authorization: `Bearer ${this.props.accessToken}` } })
        }
        const listText = await listResp.text()
        if (!listResp.ok) {
          return {
            content: [
              {
                type: 'text',
                text: `${listResp.status === 401 || listResp.status === 403 ? REAUTH_HELP + ' ' : ''}Gmail search failed: ${listText}`,
              },
            ],
          }
        }
        let listData: { messages?: Array<{ id: string; threadId: string }>; nextPageToken?: string } = {}
        try {
          listData = JSON.parse(listText)
        } catch {}

        const messages = listData.messages ?? []
        const details: Array<{
          id: string
          threadId: string
          from?: string
          subject?: string
          date?: string
          snippet?: string
          internalDate?: string
        }> = []

        for (const m of messages) {
          const msgUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(m.id)}`)
          msgUrl.searchParams.set('format', 'metadata')
          // Ask only for key headers
          msgUrl.searchParams.append('metadataHeaders', 'From')
          msgUrl.searchParams.append('metadataHeaders', 'Subject')
          msgUrl.searchParams.append('metadataHeaders', 'Date')
          let msgResp = await fetch(msgUrl.toString(), { headers: { Authorization: `Bearer ${this.props.accessToken}` } })
          if ((msgResp.status === 401 || msgResp.status === 403) && (await tryRefresh())) {
            msgResp = await fetch(msgUrl.toString(), { headers: { Authorization: `Bearer ${this.props.accessToken}` } })
          }
          if (!msgResp.ok) {
            continue
          }
          const msg = (await msgResp.json()) as any
          const headers: Array<{ name: string; value: string }> = msg?.payload?.headers ?? []
          const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value
          details.push({
            id: m.id,
            threadId: m.threadId,
            from: getHeader('From'),
            subject: getHeader('Subject'),
            date: getHeader('Date'),
            snippet: msg?.snippet,
            internalDate: msg?.internalDate,
          })
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                count: details.length,
                nextPageToken: listData.nextPageToken,
                messages: details,
              }),
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
          return { content: [{ type: 'text', text: REAUTH_HELP }] }
        }
        const url = new URL('https://www.googleapis.com/drive/v3/files')
        if (q) url.searchParams.set('q', q)
        if (pageSize) url.searchParams.set('pageSize', String(pageSize))
        if (fields) url.searchParams.set('fields', fields)
        if (pageToken) url.searchParams.set('pageToken', pageToken)
        // helpful defaults
        url.searchParams.set('spaces', 'drive')
        url.searchParams.set('orderBy', 'modifiedTime desc')
        let resp = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${this.props.accessToken}` },
        })
        if ((resp.status === 401 || resp.status === 403) && (await tryRefresh())) {
          resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${this.props.accessToken}` } })
        }
        const text = await resp.text()
        if (!resp.ok) {
          return {
            content: [
              {
                type: 'text',
                text: `${resp.status === 401 || resp.status === 403 ? REAUTH_HELP + ' ' : ''}Drive list failed: ${text}`,
              },
            ],
          }
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
          return { content: [{ type: 'text', text: REAUTH_HELP }] }
        }
        let resp = await fetch('https://docs.googleapis.com/v1/documents', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.props.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title }),
        })
        if ((resp.status === 401 || resp.status === 403) && (await tryRefresh())) {
          resp = await fetch('https://docs.googleapis.com/v1/documents', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.props.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title }),
          })
        }
        const raw = await resp.text()
        if (!resp.ok)
          return {
            content: [
              {
                type: 'text',
                text: `${resp.status === 401 || resp.status === 403 ? REAUTH_HELP + ' ' : ''}Docs create failed: ${raw}`,
              },
            ],
          }
        let documentId: string | undefined
        try {
          const body = JSON.parse(raw)
          documentId = body.documentId ?? body.document?.documentId
        } catch {}
        if (documentId) this.lastDocId = documentId
        const payload = documentId ? { docId: documentId, title } : { title }
        return { content: [{ type: 'text', text: JSON.stringify(payload) }] }
      },
    )

    // Docs: append text
    this.server.tool(
      'docs_append_text',
      {
        docId: z
          .string()
          .optional()
          .describe('Document ID. If omitted, uses the most recently created document in this session.'),
        text: z.string(),
      },
      async ({ docId, text }) => {
        if (!this.props.accessToken) {
          return { content: [{ type: 'text', text: REAUTH_HELP }] }
        }
        const effectiveDocId = docId ?? this.lastDocId
        if (!effectiveDocId) {
          return {
            content: [
              {
                type: 'text',
                text: 'No docId provided and no recent document found. Create a document first or pass docId explicitly.',
              },
            ],
          }
        }
        const url = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(effectiveDocId)}:batchUpdate`
        const requests = [
          {
            insertText: {
              text: text,
              endOfSegmentLocation: {},
            },
          },
        ]
        let resp = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.props.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
        })
        if ((resp.status === 401 || resp.status === 403) && (await tryRefresh())) {
          resp = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.props.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests }),
          })
        }
        const bodyText = await resp.text()
        if (!resp.ok)
          return {
            content: [
              {
                type: 'text',
                text: `${resp.status === 401 || resp.status === 403 ? REAUTH_HELP + ' ' : ''}Docs append failed: ${bodyText}`,
              },
            ],
          }
        // keep track of last doc id if successful
        this.lastDocId = effectiveDocId
        return { content: [{ type: 'text', text: bodyText }] }
      },
    )

    // Combined helper: create a document and append text to it
    this.server.tool(
      'docs_create_and_append',
      { title: z.string().describe('Document title'), text: z.string().describe('Text to append after creation') },
      async ({ title, text }) => {
        if (!this.props.accessToken) {
          return { content: [{ type: 'text', text: REAUTH_HELP }] }
        }
        // Create
        let createResp = await fetch('https://docs.googleapis.com/v1/documents', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.props.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title }),
        })
        if ((createResp.status === 401 || createResp.status === 403) && (await tryRefresh())) {
          createResp = await fetch('https://docs.googleapis.com/v1/documents', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.props.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title }),
          })
        }
        const createdRaw = await createResp.text()
        if (!createResp.ok) {
          return {
            content: [
              {
                type: 'text',
                text: `${createResp.status === 401 || createResp.status === 403 ? REAUTH_HELP + ' ' : ''}Docs create failed: ${createdRaw}`,
              },
            ],
          }
        }
        let documentId: string | undefined
        try {
          const body = JSON.parse(createdRaw)
          documentId = body.documentId ?? body.document?.documentId
        } catch {}
        if (!documentId) {
          return { content: [{ type: 'text', text: 'Created document but could not parse documentId.' }] }
        }
        this.lastDocId = documentId

        // Append
        const url = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`
        const requests = [
          { insertText: { text, endOfSegmentLocation: {} } },
        ]
        let appendResp = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.props.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
        })
        if ((appendResp.status === 401 || appendResp.status === 403) && (await tryRefresh())) {
          appendResp = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.props.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests }),
          })
        }
        const appendRaw = await appendResp.text()
        if (!appendResp.ok) {
          return {
            content: [
              {
                type: 'text',
                text: `${appendResp.status === 401 || appendResp.status === 403 ? REAUTH_HELP + ' ' : ''}Docs append failed: ${appendRaw}`,
              },
            ],
          }
        }
        return { content: [{ type: 'text', text: JSON.stringify({ docId: documentId, appended: true }) }] }
      },
    )

    // Docs: get document
    this.server.tool(
      'docs_get',
      {
        docId: z
          .string()
          .optional()
          .describe('Document ID. If omitted, uses the most recently created document in this session.'),
      },
      async ({ docId }) => {
        if (!this.props.accessToken) {
          return { content: [{ type: 'text', text: REAUTH_HELP }] }
        }
        const effectiveDocId = docId ?? this.lastDocId
        if (!effectiveDocId) {
          return {
            content: [
              {
                type: 'text',
                text: 'No docId provided and no recent document found. Create a document first or pass docId explicitly.',
              },
            ],
          }
        }
        const url = `https://docs.googleapis.com/v1/documents/${encodeURIComponent(effectiveDocId)}`
        let resp = await fetch(url, { headers: { Authorization: `Bearer ${this.props.accessToken}` } })
        if ((resp.status === 401 || resp.status === 403) && (await tryRefresh())) {
          resp = await fetch(url, { headers: { Authorization: `Bearer ${this.props.accessToken}` } })
        }
        const text = await resp.text()
        if (!resp.ok)
          return {
            content: [
              {
                type: 'text',
                text: `${resp.status === 401 || resp.status === 403 ? REAUTH_HELP + ' ' : ''}Docs get failed: ${text}`,
              },
            ],
          }
        // keep track of last doc id if successful
        this.lastDocId = effectiveDocId
        return { content: [{ type: 'text', text }] }
      },
    )

    // Sheets: create spreadsheet
    this.server.tool(
      'sheets_create',
      { title: z.string().describe('Spreadsheet title') },
      async ({ title }) => {
        if (!this.props.accessToken) {
          return { content: [{ type: 'text', text: REAUTH_HELP }] }
        }
        let resp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.props.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ properties: { title } }),
        })
        if ((resp.status === 401 || resp.status === 403) && (await tryRefresh())) {
          resp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.props.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ properties: { title } }),
          })
        }
        const text = await resp.text()
        if (!resp.ok)
          return {
            content: [
              {
                type: 'text',
                text: `${resp.status === 401 || resp.status === 403 ? REAUTH_HELP + ' ' : ''}Sheets create failed: ${text}`,
              },
            ],
          }
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
          return { content: [{ type: 'text', text: REAUTH_HELP }] }
        }
        const url = new URL(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(
            range,
          )}:append`,
        )
        url.searchParams.set('valueInputOption', valueInputOption)
        let resp = await fetch(url.toString(), {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.props.accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values }),
        })
        if ((resp.status === 401 || resp.status === 403) && (await tryRefresh())) {
          resp = await fetch(url.toString(), {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.props.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values }),
          })
        }
        const text = await resp.text()
        if (!resp.ok)
          return {
            content: [
              {
                type: 'text',
                text: `${resp.status === 401 || resp.status === 403 ? REAUTH_HELP + ' ' : ''}Sheets append failed: ${text}`,
              },
            ],
          }
        return { content: [{ type: 'text', text }] }
      },
    )

    // Sheets: get values
    this.server.tool(
      'sheets_get_values',
      { spreadsheetId: z.string(), range: z.string() },
      async ({ spreadsheetId, range }) => {
        if (!this.props.accessToken) {
          return { content: [{ type: 'text', text: REAUTH_HELP }] }
        }
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
          spreadsheetId,
        )}/values/${encodeURIComponent(range)}`
        let resp = await fetch(url, { headers: { Authorization: `Bearer ${this.props.accessToken}` } })
        if ((resp.status === 401 || resp.status === 403) && (await tryRefresh())) {
          resp = await fetch(url, { headers: { Authorization: `Bearer ${this.props.accessToken}` } })
        }
        const text = await resp.text()
        if (!resp.ok)
          return {
            content: [
              {
                type: 'text',
                text: `${resp.status === 401 || resp.status === 403 ? REAUTH_HELP + ' ' : ''}Sheets get values failed: ${text}`,
              },
            ],
          }
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
