import { NextRequest, NextResponse } from "next/server";

// ==========================================
// Constants
// ==========================================

const API_URL = process.env.NEXT_PUBLIC_AXIS_API_BASE_URL || "https://axis-api.yusukekikuta-05.workers.dev";

// ==========================================
// GET Handler
// ==========================================

/**
 * GET /api/user/invite-codes
 * 
 * Fetch user's invite codes from backend
 * Requires wallet address in query params
 * 
 * @param request - Next.js request object
 * @returns JSON response with invite codes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet");

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Fetch from backend API
    const response = await fetch(
      `${API_URL}/user/invite-codes?wallet=${walletAddress}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch invite codes");
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      codes: data.invite_codes || [],
    });
  } catch (error) {
    console.error("Error fetching invite codes:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}

// ==========================================
// POST Handler
// ==========================================

/**
 * POST /api/user/invite-codes
 * 
 * Generate new invite codes for a user (called during registration)
 * Requires wallet address in request body
 * 
 * @param request - Next.js request object
 * @returns JSON response with generated invite codes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Generate codes via backend API
    const response = await fetch(`${API_URL}/user/generate-invite-codes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ wallet_address: walletAddress }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate invite codes");
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      codes: data.invite_codes || [],
    });
  } catch (error) {
    console.error("Error generating invite codes:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Internal server error" 
      },
      { status: 500 }
    );
  }
}
