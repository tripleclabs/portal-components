# Contributing

Keep components pure, semantic and copyable. Add contracts and reviewed HTML examples for every new prop/slot. Prefer native HTML behavior; do not add a visual simulation of an interactive widget without the behavior and keyboard tests.

Run the commands in README. For component/example changes, update the expected HTML in `rendered/`, review the source and preview together, then run `npm run previews:record`. This records fixture integrity; it does not claim runtime equivalence. No platform checkout, credentials or Swift installation is required. Keep the machine catalogue and LLM documentation generated from the same maintained sources. Do not edit generated reference files by hand. Production consumers validate these expected HTML fixtures against their renderer in their own CI.

A useful change includes an example of its empty, disabled/error or repeated state where relevant. Review token changes for contrast in every supplied theme. Preserve existing props and slots or explicitly bump compatibility and document migration.
