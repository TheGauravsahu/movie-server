# Movie Server

A small, private-network movie library for streaming videos from a Windows PC to a browser on the same Wi-Fi network. The server reads files directly from disk and supports HTTP byte ranges so compatible players can seek without downloading a whole movie first.

## Requirements

- Windows, macOS, or Linux
- Node.js 18 or newer
- pnpm (or another package manager that can install the dependencies)
- Video files in a folder you can read
- A browser on the PC or another device on the same trusted local network

## Install and start

Open PowerShell in the project folder:

```powershell
pnpm install
pnpm start
```

By default, the server scans `Downloads\Movies` under the current Windows user profile (for example, `C:\Users\YourName\Downloads\Movies`). Keep the terminal running while you watch. Stop the server with **Ctrl+C**.

Open [http://localhost:3000](http://localhost:3000) on the PC.

### Choose a different folder or port

Set `MOVIE_DIR` and, optionally, `PORT` before starting the server:

```powershell
$env:MOVIE_DIR = "D:\Media\Films"
$env:PORT = "3000"
pnpm start
```

These environment variables apply to that PowerShell window. Start a new terminal and set them again after closing it.

## Watch on a phone or tablet

1. Start the server on the PC and leave its terminal open.
2. Connect the phone and PC to the same Wi-Fi network. Guest Wi-Fi or router client isolation can prevent devices from reaching each other.
3. On the PC, run `ipconfig` and find the **IPv4 Address** under the active Wi-Fi adapter.
4. On the phone, open `http://<PC-IPv4-address>:3000`, replacing the example address with the PC's current address. For example: `http://192.168.1.5:3000`.

The address can change when the PC reconnects to Wi-Fi, so check `ipconfig` again if the link stops working.

### Windows Firewall

If the site opens on the PC but not on the phone, Windows Firewall may be blocking inbound traffic. From **PowerShell opened as Administrator**, add a rule limited to port 3000, the Node.js executable, and the local subnet:

```powershell
New-NetFirewallRule -DisplayName "Movie Server on Wi-Fi" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Program "C:\Program Files\nodejs\node.exe" -RemoteAddress LocalSubnet -Profile Private,Public
```

If Node.js is installed elsewhere, replace the `-Program` path with the path shown by `(Get-Command node).Source`. To remove the rule later:

```powershell
Remove-NetFirewallRule -DisplayName "Movie Server on Wi-Fi"
```

Do not expose port 3000 through router port forwarding. This server has no login or encryption; use it only on a trusted local network.

## Features

- **Streaming-app layout:** featured movie, horizontal movie shelves, and dedicated Home, Search, and My List tabs. Mobile navigation stays docked at the bottom of the screen.
- **Generated artwork:** colorful poster-style cards are created from filenames, so no internet connection or poster service is required. These are decorative placeholders, not movie cover art.
- **Automatic library:** lists supported video files from the configured folder.
- **Search and sorting:** filter by filename and sort A–Z or Z–A.
- **Favorites:** save favorites in the browser and see them in My List. Favorites are local to that browser/device.
- **Continue watching:** remembers playback position in that browser and offers to resume. A finished movie's saved position is cleared.
- **Shuffle:** play a random movie from your library.
- **Refresh:** rescan the movie folder without restarting the server.
- **Focused player:** opens a responsive player dialog using the browser's native video controls and inline playback where supported. On mobile, use the player's fullscreen control for an immersive view.
- **Range streaming:** supports byte-range requests for seeking and partial playback.

The library is rescanned when it loads or when **Refresh** is pressed. It only lists files directly inside the configured folder; it does not scan subfolders.

## Supported file types and playback

The library recognizes `.avi`, `.m4v`, `.mkv`, `.mov`, `.mp4`, and `.webm` files. Recognition does not guarantee that a browser can decode the file: video and audio codecs vary by device and browser. In particular, many mobile browsers do not play MKV or AVI files directly. This project does not transcode or convert video.

## Troubleshooting

- **The PC cannot open the page:** confirm `pnpm start` is still running and displays the port. Try `http://localhost:3000` on the PC.
- **The phone says the site cannot be reached:** verify the PC's current Wi-Fi IPv4 address with `ipconfig`, confirm both devices are on the same non-guest Wi-Fi, and check the Windows Firewall rule above. The server must remain running.
- **The library reports a folder error:** confirm the folder exists and the account running Node.js can read it. Set `MOVIE_DIR` to the correct path and restart.
- **A movie does not appear:** check its extension against the supported list and press **Refresh**.
- **A movie appears but will not play or seek:** the browser may not support its codec/container. Try a browser-compatible MP4 or WebM encode; this server does not transcode.
- **Playback resumes on another device at a different position:** favorites and resume positions are stored separately in each browser's local storage.

## HTTP endpoints

- `GET /` — movie library web page
- `GET /api/movies` — JSON list containing each movie's filename, display title, and stream URL
- `GET /stream/<filename>` — streams a listed video; supports a single HTTP byte range and returns `416` for an invalid range

## Privacy and security

The server is intended for a trusted home LAN. It listens on all network interfaces so other devices on the same network can connect. There is no authentication, access control, TLS, or transcoding. Anyone who can reach the server can browse and stream supported files in the configured movie folder. Do not use this on an untrusted network or expose it directly to the internet.
