# Google Play Icon

Final upload file:

- `play-store-icon.png`
- `feature-graphic.png`
- `phone-screenshots/phone-01-viagem-ativa.png`
- `phone-screenshots/phone-02-evidencias.png`

Requirements checked against Google Play guidance:

- `512 x 512`
- PNG
- Full square artwork
- Under `1024 KB`
- No pre-rounded corners or external drop shadow

Feature graphic requirements:

- `1024 x 500`
- PNG without alpha
- Under `1024 KB`

Phone screenshot requirements:

- `1080 x 1920`
- PNG without alpha
- Under `8 MB`
- 9:16 portrait app screenshots

Regenerate:

```sh
node store-assets/google-play/generate-play-icon.js
node store-assets/google-play/generate-feature-graphic.js
node store-assets/google-play/generate-phone-screenshots.js
```
