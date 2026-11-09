# Contributing

This repository is a **generated distribution mirror**. Authoritative source is maintained in platform at `packages/portal-components`. Make changes upstream; the library, docs and production-rendered previews are exported here. Public CI needs Node only and never depends on platform. Platform runtime consumes a pinned public commit, not the authoring directory.

Keep components pure, semantic and copyable. Add contracts and real-renderer examples for every new prop/slot. Prefer native HTML behavior; do not add a visual simulation of an interactive widget without the behavior and keyboard tests.

Run the commands in README. Source changes require regeneration through the platform Swift renderer before the public site build can pass. Keep the machine catalogue and LLM documentation generated from the same maintained sources. Do not edit generated HTML or generated reference files by hand.

A useful change includes an example of its empty, disabled/error or repeated state where relevant. Review token changes for contrast in every supplied theme. Preserve existing props and slots or explicitly bump compatibility and document migration.
