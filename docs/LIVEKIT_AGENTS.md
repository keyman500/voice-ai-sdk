# LiveKit agents and dispatch rules

This document summarizes how the voice-ai-sdk maps “agents” to LiveKit and what you need to do to create multiple LiveKit agents without conflicts.

## How the SDK maps agents to LiveKit

In this SDK, a **LiveKit agent** is implemented as a **SIP dispatch rule**. When you call `livekit.agents.create()`, the SDK calls LiveKit’s `createSipDispatchRule` under the hood. There is no separate “agent object” in LiveKit’s server API; the dispatch rule is the thing that routes inbound SIP calls into rooms and can dispatch agent workers into those rooms.

So:

- **One agent (in SDK terms) = one SIP dispatch rule (in LiveKit terms).**
- To support multiple agents, you must create multiple dispatch rules that do not conflict.

## Why “duplicate” agents fail: uniqueness rule

LiveKit allows only **one dispatch rule per (trunk, inbound number, number, PIN)** combination. If you create a second rule with the same combination, LiveKit returns an error like:

```text
[livekit] Dispatch rule for the same trunk, inbound number, number, and PIN combination already exists in dispatch rule "SDR_xxxx" "Agent Name"
```

What that means:

- **Trunk** – Which SIP inbound trunk the call comes from. If you omit `trunkIds`, the rule applies to *all* trunks (a single “catch‑all” scope).
- **Inbound number** – The number the call is *to* (destination).
- **Number** – The number the call is *from* (caller), when filtering is used.
- **PIN** – Optional PIN on the rule (e.g. for direct rules with `pin`).

The **room name** or **room prefix** (direct vs individual) is *not* part of this uniqueness. So two rules that only differ by room name still collide if they share the same trunk/number/PIN scope.

## Recommendation: unique trunk or phone number per agent

To create multiple LiveKit agents (multiple dispatch rules) that can coexist:

- **Option A – Different trunks**  
  Create a separate inbound trunk per agent and pass `trunkIds: [thatTrunkId]` when creating the agent. Each rule then has a distinct trunk scope.

- **Option B – Different phone numbers**  
  If you use a single trunk that has multiple numbers, you can still only have one rule per (trunk, number, …) in practice. So effectively each “agent” that should be reachable on its own number needs a distinct routing scope (e.g. its own trunk or a trunk+number combination that isn’t already used by another rule).

In both cases, the important point is: **each agent must have a unique (trunk, inbound number, number, PIN) combination.** The most straightforward way to achieve that is to give each agent its own trunk or its own phone number (depending on how you set up trunks and numbers in LiveKit).

## What the SDK supports today

- **`providerOptions.trunkIds`** – Optional array of trunk IDs. If provided, the dispatch rule is limited to those trunks, which helps make the rule unique when you have multiple trunks.
- **`providerOptions.ruleType`** – `"direct"` (default) or `"individual"`. Controls whether all callers go to one room (`direct` + `roomName`) or each caller gets a new room (`individual` + `roomPrefix`). This does *not* change the uniqueness rule above.
- **`providerOptions.roomName`** – Used when `ruleType` is not `"individual"`.
- **`providerOptions.roomPrefix`** – Used when `ruleType` is `"individual"`.

The SDK does not currently surface PIN or inbound-number filters in the agent create API; those are LiveKit concepts you’d use if you extend the provider options or talk to LiveKit’s API directly.

## Trunks and numbers must be real for telephony

- **Trunks** – Created via LiveKit’s SIP API (e.g. `createSipInboundTrunk`). They represent a real SIP relationship (e.g. with a provider like Telnyx). You can create multiple trunks via API; each can have its own name and numbers.
- **Phone numbers** – For inbound calls to work, numbers on an inbound trunk are the numbers you actually have from your SIP provider. LiveKit’s docs state that these are “purchased from your SIP trunking provider.” Fake or placeholder numbers won’t receive real calls.

So: use a **unique trunk or phone number per agent** for real telephony; for automated tests you can still create multiple trunks via API to get distinct `trunkIds`, but real inbound calling will require real provider setup.

## Named workers vs dispatch rules (short)

- **Named workers** – Your agent *code* running and registering with LiveKit under an `agentName`. They are not created by a “create agent” CRUD API; they are deployed and then referenced by name when dispatching.
- **Dispatch rules** – Created via the SIP API. They define *when* (which trunk/number/PIN) a call is routed and *where* (which room, and optionally which agent(s) to dispatch). This SDK’s “LiveKit agent” is this dispatch rule.

So we keep the SDK as-is: one agent = one dispatch rule, and we require a **unique trunk or phone number per agent** so that each such rule has a distinct (trunk, inbound number, number, PIN) combination.

## References

- [LiveKit: Dispatch rule](https://docs.livekit.io/sip/dispatch-rule/)
- [LiveKit: Inbound trunk](https://docs.livekit.io/sip/trunk-inbound/)
- [LiveKit: Agent dispatch](https://docs.livekit.io/agents/server/agent-dispatch/)
- [LiveKit JS Server SDK: SipClient](https://docs.livekit.io/reference/server-sdk-js/classes/SipClient.html), [CreateSipDispatchRuleOptions](https://docs.livekit.io/reference/server-sdk-js/interfaces/CreateSipDispatchRuleOptions.html)
