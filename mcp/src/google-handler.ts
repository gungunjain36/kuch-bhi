import type { AuthRequest, OAuthHelpers } from '@cloudflare/workers-oauth-provider'
import { type Context, Hono } from 'hono'
import { fetchUpstreamAuthTokenDetailed, getUpstreamAuthorizeUrl, type Props } from './utils'
import { clientIdAlreadyApproved, parseRedirectApproval, renderApprovalDialog } from './workers-oauth-utils'

const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>()

app.get('/authorize', async (c: Context) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw)
  const { clientId } = oauthReqInfo
  if (!clientId) {
    return c.text('Invalid request', 400)
  }

  if (await clientIdAlreadyApproved(c.req.raw, oauthReqInfo.clientId, c.env.COOKIE_ENCRYPTION_KEY)) {
    return redirectToGoogle(c, oauthReqInfo)
  }

  return renderApprovalDialog(c.req.raw, {
    client: await c.env.OAUTH_PROVIDER.lookupClient(clientId),
    server: {
      description: 'KuchBhi MCP server with Google Workspace tools (Gmail, Drive, Docs, Sheets).',
      name: 'KuchBhi Google Workspace',
    },
    state: { oauthReqInfo },
  })
})

app.post('/authorize', async (c: Context) => {
  const { state, headers } = await parseRedirectApproval(c.req.raw, c.env.COOKIE_ENCRYPTION_KEY)
  if (!state.oauthReqInfo) {
    return c.text('Invalid request', 400)
  }

  return redirectToGoogle(c, state.oauthReqInfo, headers)
})

async function redirectToGoogle(c: Context, oauthReqInfo: AuthRequest, headers: Record<string, string> = {}) {
  return new Response(null, {
    headers: {
      ...headers,
      location: getUpstreamAuthorizeUrl({
        clientId: c.env.GOOGLE_CLIENT_ID,
        hostedDomain: c.env.HOSTED_DOMAIN,
        redirectUri: new URL('/callback', c.req.raw.url).href,
        // Expanded scopes for Gmail (send + read), Drive, Docs, Sheets
        scope:
          [
            'email',
            'profile',
            // Gmail send
            'https://www.googleapis.com/auth/gmail.send',
            // Gmail read-only basic access for listing and reading message metadata/snippets
            'https://www.googleapis.com/auth/gmail.readonly',
            // Drive read/write minimal safe set
            'https://www.googleapis.com/auth/drive.metadata.readonly',
            'https://www.googleapis.com/auth/drive.file',
            // Docs
            'https://www.googleapis.com/auth/documents',
            // Sheets
            'https://www.googleapis.com/auth/spreadsheets',
          ].join(' '),
        state: btoa(JSON.stringify(oauthReqInfo)),
        upstreamUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        // optional extra params
        extraParams: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' },
      }),
    },
    status: 302,
  })
}

/**
 * OAuth Callback Endpoint
 *
 * This route handles the callback from Google after user authentication.
 * It exchanges the temporary code for an access token, then stores some
 * user metadata & the auth token as part of the 'props' on the token passed
 * down to the client. It ends by redirecting the client back to _its_ callback URL
 */
app.get('/callback', async (c: Context) => {
  // Get the oathReqInfo out of KV
  const oauthReqInfo = JSON.parse(atob(c.req.query('state') as string)) as AuthRequest
  if (!oauthReqInfo.clientId) {
    return c.text('Invalid state', 400)
  }

  // Exchange the code for an access token
  const code = c.req.query('code')
  if (!code) {
    return c.text('Missing code', 400)
  }

  const [tokenResponse, googleErrResponse] = await fetchUpstreamAuthTokenDetailed({
    clientId: c.env.GOOGLE_CLIENT_ID,
    clientSecret: c.env.GOOGLE_CLIENT_SECRET,
    code,
    grantType: 'authorization_code',
    redirectUri: new URL('/callback', c.req.url).href,
    upstreamUrl: 'https://accounts.google.com/o/oauth2/token',
  })
  if (googleErrResponse) {
    return googleErrResponse
  }

  // Fetch the user info from Google
  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${tokenResponse.access_token}`,
    },
  })
  if (!userResponse.ok) {
    return c.text(`Failed to fetch user info: ${await userResponse.text()}`, 500)
  }

  const { id, name, email } = (await userResponse.json()) as {
    id: string
    name: string
    email: string
  }

  // Return back to the MCP client a new token
  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    metadata: {
      label: name,
    },
    props: {
      accessToken: tokenResponse.access_token,
      email,
      name,
      refreshToken: tokenResponse.refresh_token,
      userId: id,
    } as Props,
    request: oauthReqInfo,
    scope: oauthReqInfo.scope,
    userId: id,
  })

  return Response.redirect(redirectTo)
})

export { app as GoogleHandler }
