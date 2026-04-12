# Project Memory

## Core
Tema claro Instagram. Primary #0095F6 (HSL 204 100% 50%), bg branco.
Inter headings + body. Portuguese-BR interface.
App: "GrandeIrmão" — social audit feed + funding network mapper.
Bottom nav Instagram-style (Feed, Search, Create, Messages, Profile).
Lovable Cloud enabled. Google OAuth via lovable.auth.
Roles: admin (ilimitado), standard (3 buscas/mês, fontes bloqueadas).
Auth trigger auto-cria profile + role standard.

## Memories
- [Design tokens](mem://design/tokens) — Light Instagram palette, primary blue, accent pink
- [App structure](mem://features/structure) — Feed, Search, Create, Messages, Profile, Investigation
- [Data model](mem://features/data-model) — Organizations, grants, fundings, posts, comments, likes, follows, conversations, messages
- [Auth & roles](mem://features/auth) — Supabase auth + Google OAuth, user_roles table, has_role() function
- [Credits](mem://features/credits) — search_credits table, 3/month for standard, unlimited for admin
