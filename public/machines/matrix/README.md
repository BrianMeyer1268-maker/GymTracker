# Matrix manufacturer photos

These `push/pull/legs/hinge/cardio.svg` files are **local placeholder images** used as
each seed machine's `manufacturerPhoto`. They are not Matrix/Johnson Fitness artwork —
they're generated stand-ins so the catalog looks good immediately without hotlinking or
copying copyrighted product photos.

To use real Matrix product shots later (optional):

1. Download the images you want from johnsonfitness.com into this folder, e.g.
   `versa-converging-chest-press.jpg`.
2. Point that machine's `manufacturerPhoto` at it — either edit `lib/catalog.ts`
   (`manufacturerPhoto: "/machines/matrix/versa-converging-chest-press.jpg"`) or, simplest,
   just add your own **gym photo** from the Machines tab (📷), which always takes priority.

Display priority everywhere: **gym photo → manufacturer photo → icon placeholder.**
Gym photos are captured on-device (downscaled) and never leave your phone.
