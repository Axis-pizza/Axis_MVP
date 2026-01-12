/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/kagemusha.json`.
 */
export type Kagemusha = {
  "address": "2kdDnjHHLmHex8v5pk8XgB7ddFeiuBW4Yp5Ykx8JmBLd",
  "metadata": {
    "name": "kagemusha",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Kagemusha - AI-Powered Strategy Vault Protocol for Solana"
  },
  "instructions": [
    {
      "name": "deposit",
      "docs": [
        "Deposit tokens into a strategy vault.",
        "Creates or updates the user's position."
      ],
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "strategy",
          "writable": true
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "strategy"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "relations": [
            "strategy"
          ]
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "vaultTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeStrategy",
      "docs": [
        "Initialize a new strategy vault with the given parameters.",
        "",
        "# Arguments",
        "* `name` - Strategy name (max 32 chars)",
        "* `strategy_type` - 0: Sniper, 1: Fortress, 2: Wave",
        "* `target_weights` - Token weights in basis points (must sum to 10000)"
      ],
      "discriminator": [
        208,
        119,
        144,
        145,
        178,
        57,
        105,
        252
      ],
      "accounts": [
        {
          "name": "strategy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  114,
                  97,
                  116,
                  101,
                  103,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "name"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "strategyType",
          "type": "u8"
        },
        {
          "name": "targetWeights",
          "type": {
            "vec": "u16"
          }
        }
      ]
    },
    {
      "name": "tacticalRebalance",
      "docs": [
        "Execute a tactical rebalance via Jupiter swap.",
        "Only callable by the strategy owner."
      ],
      "discriminator": [
        111,
        219,
        97,
        115,
        139,
        154,
        231,
        202
      ],
      "accounts": [
        {
          "name": "strategy",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "strategy"
          ]
        },
        {
          "name": "jupiterProgram"
        },
        {
          "name": "vaultTokenIn",
          "writable": true
        },
        {
          "name": "vaultTokenOut",
          "writable": true
        },
        {
          "name": "protocolFeeAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amountIn",
          "type": "u64"
        },
        {
          "name": "minimumAmountOut",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "strategyVault",
      "discriminator": [
        159,
        204,
        238,
        219,
        38,
        201,
        136,
        177
      ]
    },
    {
      "name": "userPosition",
      "discriminator": [
        251,
        248,
        209,
        245,
        83,
        234,
        17,
        27
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidStrategyType",
      "msg": "Invalid strategy type. Must be 0 (Sniper), 1 (Fortress), or 2 (Wave)."
    },
    {
      "code": 6001,
      "name": "invalidWeightSum",
      "msg": "Weights must sum to 10000 basis points (100%)."
    },
    {
      "code": 6002,
      "name": "nameTooLong",
      "msg": "Strategy name too long. Maximum 32 characters."
    },
    {
      "code": 6003,
      "name": "unauthorized",
      "msg": "Unauthorized. Only the owner can perform this action."
    },
    {
      "code": 6004,
      "name": "strategyInactive",
      "msg": "Strategy is not active."
    },
    {
      "code": 6005,
      "name": "insufficientFunds",
      "msg": "Insufficient funds for rebalance."
    },
    {
      "code": 6006,
      "name": "slippageExceeded",
      "msg": "Slippage tolerance exceeded."
    }
  ],
  "types": [
    {
      "name": "strategyVault",
      "docs": [
        "The core account that stores a user's strategy configuration.",
        "Each strategy is a PDA derived from the owner's pubkey and strategy name."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "docs": [
              "The owner (Shogun) who created this strategy"
            ],
            "type": "pubkey"
          },
          {
            "name": "name",
            "docs": [
              "Human-readable name (max 32 chars)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "strategyType",
            "docs": [
              "Strategy type: 0 = Sniper, 1 = Fortress, 2 = Wave"
            ],
            "type": "u8"
          },
          {
            "name": "targetWeights",
            "docs": [
              "Target weights in basis points (10000 = 100%)",
              "Each element represents the weight for a token in the composition"
            ],
            "type": {
              "array": [
                "u16",
                10
              ]
            }
          },
          {
            "name": "numTokens",
            "docs": [
              "Number of active tokens in the composition"
            ],
            "type": "u8"
          },
          {
            "name": "isActive",
            "docs": [
              "Whether the strategy is actively rebalancing"
            ],
            "type": "bool"
          },
          {
            "name": "tvl",
            "docs": [
              "Total value locked in the vault (in lamports equivalent)"
            ],
            "type": "u64"
          },
          {
            "name": "feesCollected",
            "docs": [
              "Accumulated fees collected"
            ],
            "type": "u64"
          },
          {
            "name": "lastRebalance",
            "docs": [
              "Last rebalance timestamp"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "userPosition",
      "docs": [
        "Tracks individual user deposits into a strategy vault."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vault",
            "docs": [
              "The strategy vault this position belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "user",
            "docs": [
              "The user who owns this position"
            ],
            "type": "pubkey"
          },
          {
            "name": "lpShares",
            "docs": [
              "Amount of LP tokens representing share ownership"
            ],
            "type": "u64"
          },
          {
            "name": "depositTime",
            "docs": [
              "Timestamp of initial deposit"
            ],
            "type": "i64"
          },
          {
            "name": "entryValue",
            "docs": [
              "Entry value in USDC (for PnL calculation)"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    }
  ]
};
