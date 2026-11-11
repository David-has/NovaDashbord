# Nova Dashboard

A modern, responsive admin dashboard built with plain HTML, CSS and JavaScript. No frameworks, no dependencies, no build step.

> The interface text is in Romanian. All demo data is generated locally and does not come from a server.

## Features

- **Sidebar navigation** with icons. It collapses to icons only on desktop and slides in as a drawer on mobile.
- **Overview**: four animated stat cards with trends against the previous period, an interactive revenue chart (7, 30 or 90 days) drawn on canvas with a hover tooltip, traffic sources and a recent activity feed.
- **Orders**: search, status filter, sorting on any column, pagination, one-click status change and CSV export of the filtered results.
- **Tasks**: add, complete, delete and filter tasks with normal or urgent priority. Saved in `localStorage`.
- **Settings**: change your name, pick one of five accent colors and choose a theme (auto, light or dark).
- **Profile menu** on the avatar: availability status, shortcuts to settings and tasks, theme toggle, quick accent colors, sidebar collapse and a (demo) sign out.
- **Animated page transitions**: the old page fades out, a progress bar sweeps across the top, the new page rises in card by card, and a pill slides between sidebar items.
- **Notifications** with an unread counter and a "Mark all as read" action.
- **Light and dark themes**, following the system setting by default.
- **Responsive** from phones to wide desktops, with safe-area support, keyboard focus styles and reduced-motion support.

## Project structure

```
dashboard/
├── index.html
├── css/
│   └── style.css    styles, split into numbered sections
└── js/
    ├── data.js      demo data (revenue, orders, tasks, notifications)
    └── app.js       application logic
```

## Getting started

Open `index.html` in a browser, or serve the folder with any static server:

```bash
cd dashboard
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

The font (Plus Jakarta Sans) loads from Google Fonts. Without an internet connection the dashboard falls back to system fonts.

## Customization

- **Colors and theme:** edit the CSS variables in section 1 of `css/style.css`. Light and dark values are defined separately.
- **Demo data:** edit `js/data.js`, or replace it with calls to your own API.
- **Add a view:** add a nav button with a `data-view` name and a `<section class="view" id="view-NAME">` in `index.html`, then add the name to the `VIEWS` array in `js/app.js`.
- **Accent colors:** add a `.swatch` button with a `data-color` value in the settings section.

## Notes

- CSV export uses a downloaded file, so it works when you open the project locally but may be blocked inside embedded previews.
- Settings, tasks and the sidebar state are stored in the browser's `localStorage`. "Reset everything" in Settings clears them.

## License

Add the license of your choice before publishing, for example MIT.
