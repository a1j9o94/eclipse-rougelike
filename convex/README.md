# Second Dawn backend

Current executable functions are the `eclipse*.ts` modules: guest/profile identity, saved matches, multiplayer rooms, command validation and scheduled AI work. Pure game rules live in `shared/eclipse/`.

`schema.ts` contains versioned `eclipse*V1` tables and retained historical table definitions. The latter preserve compatibility with existing deployment data; their old gameplay endpoints have been removed. Do not drop those tables or delete data as part of routine source cleanup.

`_generated/` is maintained by `npm run codegen`. See the repository's `DEPLOYMENT.md` for the development-environment release target and Git-based deployment process.
