import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge" // Use Edge Runtime for better performance

// Reject hostnames that resolve to private/internal ranges to prevent SSRF.
// This covers IPv4 private, loopback, link-local, and cloud metadata endpoints.
const PRIVATE_HOST_PATTERN =
  /^(localhost|.*\.local(host)?|.*\.internal)$|^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.|169\.254\.|[fF][cCdD]|::1)/

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_HOST_PATTERN.test(hostname)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get("url")

  if (!url) {
    return NextResponse.json(
      { error: "Missing URL parameter" },
      { status: 400 }
    )
  }

  // Validate URL format and block SSRF targets
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "Invalid URL protocol" },
        { status: 400 }
      )
    }
    if (isPrivateHost(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: "URL target is not allowed" },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid URL format" },
      { status: 400 }
    )
  }

  try {
    // Fetch the playlist from the server side (bypasses CORS)
    const response = await fetch(url, {
      headers: {
        "User-Agent": "OpenIPTV/1.0",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const content = await response.text()

    // Return the content with appropriate headers
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    })
  } catch (error) {
    console.error("Proxy error:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch playlist", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
}
