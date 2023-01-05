import json
import re
from urllib.parse import quote_plus, unquote_plus

import api


def html_link(text, *href, root=False, folder=True, anchor=None):
    if href[0].startswith("http://") or href[0].startswith("https://"):
        href = href[0]
    else:
        href = "/".join((quote_plus(h) for h in href))
        href = f"{'/' if root else ''}{href}{'/' if folder else ''}{'#' + anchor if anchor else ''}"
    return f"<a href='{href}'>{text}</a>"


def html_form_link(href, data, text):
    data = json.dumps(data)
    return "\n".join(
        [
            f"<form method='post' action='{href}'>",
            f"<input type='hidden' name='data' value='{data}' />",
            f"<input type='submit' value='{text}' />",
            "</form>",
        ]
    )


def get_header(client):
    return [
        """<!DOCTYPE html>
        <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <style>
        body {
            max-width: 800px;
            margin: 10px auto;
            padding: 10px;
        }
        div { line-height: 2em; }
        form { display: inline-block; }
        table td:first-child { font-weight: bold; }
        #current {
            border-left: solid 2px;
            padding-left: 0.5em;
            font-weight: bold;
        }
        </style>
        <script>
        document.addEventListener("DOMContentLoaded", () => {
            Array.from(document.getElementsByTagName("form"))
            .filter(f => f.method === "post")
            .map(f => {
                f.addEventListener("submit", (event) => {
                    event.preventDefault();
                    fetch(event.target.action, {
                        method: event.target.method,
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                        body: new URLSearchParams(new FormData(f)),
                    })
                    .then(() => window.location.reload(true));
                });
            });
        });
        </script>
        </head>
        <body>
        """,
        "<div style='line-height: 2em'>",
        " ".join(
            [
                html_form_link(
                    "/mpd/api/pause",
                    {},
                    "Pause" if client.status()["state"] == "play" else "Play",
                ),
                html_form_link("/mpd/api/previous", {}, "Prev"),
                html_form_link("/mpd/api/next", {}, "Next"),
                "<form action='/mpd/search'><input name='s'/> <input type='submit' value='Search' /></form>",
            ]
        ),
        "</div>",
        "<div style='line-height: 2em'>",
        " | ".join(
            [
                html_link("Status", "mpd", "status", root=True, folder=False),
                html_link(
                    "Queue", "mpd", "queue", anchor="current", root=True, folder=False
                ),
                html_link("AlbumArtists", "mpd", "albumartists", root=True),
                html_link("Artists", "mpd", "artists", root=True),
                html_link("Albums", "mpd", "albums", root=True),
                html_link("Playlists", "mpd", "playlists", root=True),
            ]
        ),
        "</div>",
    ]


def create_list_page(header, data, thelist):
    lines = [f"<h1>{header}</h1>"]
    if data:
        lines.extend(
            [
                "<p>",
                html_form_link("/mpd/api/insert", data, "Add after current"),
                html_form_link("/mpd/api/append", data, "Append to queue"),
                "</p>",
            ]
        )
    lines.extend(thelist)
    return lines


def create_song_page(client, header, data):
    song_info = client.find(*api.info_pairs(data))[0]
    thelist = ["<table>"]
    for key, value in sorted(song_info.items()):
        href = None
        if key == "artist":
            href = ("mpd", "artists", value)
        elif key == "albumartist":
            href = ("mpd", "albumartists", value)
        elif key == "album":
            href = ("mpd", "albums", value)
        elif key == "duration":
            value = f"{int(float(value)/60)}:{int(float(value)%60)} ({value})"
        elif key == "musicbrainz_albumartistid":
            key = "MB AlbumArtist ID"
            href = (f"https://musicbrainz.org/artist/{value}",)
        elif key == "musicbrainz_albumid":
            key = "MB Album ID"
            href = (f"https://musicbrainz.org/album/{value}",)
        elif key == "musicbrainz_artistid":
            key = "MB Artist ID"
            href = (f"https://musicbrainz.org/artist/{value}",)
        elif key == "musicbrainz_trackid":
            key = "MB Track ID"
            href = (f"https://musicbrainz.org/recording/{value}",)
        if href:
            value = html_link(value, *href, root=True)
        thelist.append(f"<tr><td>{key}</td><td>{value}</td></tr>")
    thelist.append("</table>")
    return create_list_page(header, data, thelist)


def fmt_secs(s):
    yrs = int(s / 31536000)
    s = s % 31536000
    days = int(s / 86400)
    s = s % 86400
    hrs = int(s / 3600)
    s = s % 3600
    mins = int(s / 60)
    secs = int(s % 60)
    return ', '.join(x for x in [
        f"{yrs} years" if yrs else "",
        f"{days} days" if days else "",
        f"{hrs} hours" if hrs else "",
        f"{mins} mins" if mins else "",
        f"{secs} secs" if secs else "",
    ] if x)


def handle_get(client, path, query):
    path_parts = [
        unquote_plus(p) for p in path.removeprefix("/").removesuffix("/").split("/")
    ]

    header = "Unknown?"
    data = {}
    thelist = []
    if path == "/status":
        status = client.status()

        def gen_mode_button(mode):
            enabled = status[mode] == "1"
            title = f"{mode.title()} mode"
            button = html_form_link(
                f"/mpd/api/{mode}",
                {"enabled": "0" if enabled else "1"},
                "disable" if enabled else "enable",
            )
            value = "✓" if enabled else "✗"
            return [f"<tr><td>{title}:</td><td>{value}</td><td>{button}</td></tr>"]

        stats = client.stats()

        volume = status.get("volume", "unknown")
        return [
            f"<h1>Status</h1>",
            "<table>",
            f"<tr><td>Volume:</td><td>{volume}</td><td>",
            html_form_link("/mpd/api/volume", {"volume": -10}, "-10"),
            html_form_link("/mpd/api/volume", {"volume": -5}, "-5"),
            html_form_link("/mpd/api/volume", {"volume": -1}, "-1"),
            html_form_link("/mpd/api/volume", {"volume": +1}, "+1"),
            html_form_link("/mpd/api/volume", {"volume": +5}, "+5"),
            html_form_link("/mpd/api/volume", {"volume": +10}, "+10"),
            "</td></tr>",
            *gen_mode_button("repeat"),
            *gen_mode_button("random"),
            *gen_mode_button("single"),
            *gen_mode_button("consume"),
            "</table>",
            "<h2>Library</h2>",
            "<table>",
            f"<tr><td>Up time:</td><td>{fmt_secs(int(stats['uptime']))}</td></tr>",
            f"<tr><td>Play time:</td><td>{fmt_secs(int(stats['playtime']))}</td></tr>",
            "<tr><td>&nbsp;</td></tr>",
            f"<tr><td># Artists:</td><td>{int(stats['artists']):,.0f}</td></tr>",
            f"<tr><td># Albums:</td><td>{int(stats['albums']):,.0f}</td></tr>",
            f"<tr><td># Songs:</td><td>{int(stats['songs']):,.0f}</td></tr>",
            "<tr><td>&nbsp;</td></tr>",
            f"<tr><td>DB Play time:</td><td>{fmt_secs(int(stats['db_playtime']))}</td></tr>",
            f"<tr><td>DB updated:</td><td>{stats['db_update']}</td></tr>",
            "</table>",
        ]

    elif path == "/queue":
        thelist = [
            "<h1>Queue</h1>",
            "<div>",
            html_form_link("/mpd/api/clear", {}, "Clear queue"),
            "</div>",
            "<ol>",
        ]
        for song in api.list_queue(client):
            artist = song.get("albumartist", song.get("artist"))
            album = song.get("album")
            title = song.get("title", song.get("name", song.get("file")))

            song_link = html_link(
                title, "albumartists", artist, album, title, folder=False
            )
            current = "current" in song

            play_now = ""
            if not current:
                play_now = html_form_link(
                    "/mpd/api/play", {"id": song["pos"]}, "Play now"
                )

            thelist.append(
                f"<li {'id=current' if current else ''}>"
                + "<br/>".join(
                    [
                        song_link + " " + play_now,
                        f"{artist} - {album}",
                    ]
                )
                + "</li>"
            )
        thelist.append("</ol>")
        return thelist

    elif path == "/search":
        query = query.get("s")

        thelist = []
        if query and len(query) >= 3:
            thelist.append("<ul>")
            for song in sorted(client.search("any", query), key=lambda x: x["title"]):
                artist_type = "albumartists" if "albumartist" in song else "artists"
                href = (
                    "..",
                    artist_type,
                    song.get("albumartist", song.get("artist")),
                    song["album"],
                    song["title"],
                )
                thelist.append(
                    "<li>"
                    + html_link(song["title"], *href)
                    + f"<br/>{song['artist']} - {song['album']}</li>"
                )
            thelist.append("</ul>")
        return create_list_page("Search Results", None, thelist)

    elif path == "/playlists/":
        return create_list_page(
            "Playlists",
            {},
            [
                "<ul>",
                *[
                    "<li>" + html_link(a, a) + "</li>"
                    for a in api.list_playlists(client)
                ],
                "</ul>",
            ],
        )

    elif re.fullmatch("/playlists/[^/]+", path):
        playlist_name = path_parts[1]
        header = " / ".join([html_link("Playlists", ".."), playlist_name])
        data = {"playlist": playlist_name}
        thelist = ["<ul>"]
        for song in api.list_titles(client, {"playlist": playlist_name}):
            name = song.get("title")
            if not name:
                name = song.get("name")
            if not name:
                name = song.get("file")
            thelist.append(f"<li>{name}</li>")
        thelist.append("</ul>")
        return create_list_page(header, data, thelist)

    elif path == "/albumartists/" or path == "/artists/":
        list_func = (
            api.list_albumartists
            if path_parts[0] == "albumartists"
            else api.list_artists
        )
        return create_list_page(
            path_parts[0].title(),
            {},
            [
                "<ul>",
                *["<li>" + html_link(a, a) + "</li>" for a in list_func(client)],
                "</ul>",
            ],
        )

    elif re.fullmatch("/(album)?artists/[^/]+/", path):
        artist_type = "albumartist" if path_parts[0] == "albumartists" else "artist"
        header = " / ".join([html_link(path_parts[0].title(), ".."), path_parts[1]])
        data = {"artist": path_parts[1]}
        thelist = [
            "<ul>",
            "<li>" + html_link("All", "tracks") + "</li>",
            *[
                "<li>" + html_link(a, a) + "</li>"
                for a in api.list_albums(
                    client,
                    {artist_type: path_parts[1]},
                )
            ],
            "</ul>",
        ]
        return create_list_page(header, data, thelist)

    elif re.fullmatch("/(album)?artists/[^/]+/[^/]+/", path):
        artist_type = path_parts[0].removesuffix("s")
        all_tracks = path_parts[2] == "tracks"
        header = " / ".join(
            [
                html_link(path_parts[0].title(), "..", ".."),
                html_link(path_parts[1], ".."),
                path_parts[2],
            ]
        )
        data = {
            artist_type: path_parts[1],
            "album": None if all_tracks else path_parts[2],
        }

        thelist = ["<ul>" if all_tracks else "<ol>"]
        sort_func = lambda a: a["title"] if all_tracks else int(a["track"])
        for a in sorted(api.list_titles(client, data), key=sort_func):
            value = a["track"]
            link = html_link(a["title"], a["title"], folder=False)
            thelist.append(f"<li value='{value}'>{link}</li>")
        thelist.append("</ul>" if all_tracks else "</ol>")
        return create_list_page(header, data, thelist)

    elif re.fullmatch("/(album)?artists/[^/]+/[^/]+/[^/]+", path):
        artist_type = path_parts[0].removesuffix("s")
        artist_name = path_parts[1]
        album_name = path_parts[2]
        track_name = path_parts[3]

        header = " / ".join(
            [
                html_link(path_parts[0].title(), "../../"),
                html_link(artist_name, "../"),
                html_link(album_name, "."),
                path_parts[3],
            ]
        )
        data = {
            artist_type: artist_name,
            "album": None if album_name == "tracks" else album_name,
            "title": track_name,
        }
        return create_song_page(client, header, data)

    elif path == "/albums/":
        thelist = [
            "<ul>",
            *["<li>" + html_link(a, a) + "</li>" for a in api.list_albums(client, {})],
            "</ul>",
        ]
        return create_list_page("Albums", {}, thelist)

    elif re.fullmatch("/albums/[^/]+/", path):
        header = " / ".join(
            [
                html_link(path_parts[0].title(), ".."),
                path_parts[1],
            ]
        )
        data = {"album": path_parts[1]}
        thelist = [
            "<ol>",
            *[
                f"<li value='{a['track']}'>"
                + html_link(a["title"], a["title"], folder=False)
                + "</li>"
                for a in api.list_titles(client, data)
            ],
            "</ol>",
        ]
        return create_list_page(header, data, thelist)

    elif re.fullmatch("/albums/[^/]+/[^/]+", path):
        album_name = path_parts[1]
        track_name = path_parts[2]

        header = " / ".join(
            [
                html_link("Albums", ".."),
                html_link(album_name, "."),
                track_name,
            ]
        )
        data = {"album": album_name, "title": track_name}
        return create_song_page(client, header, data)

    return ["<h1>Page not found</h1>", f"<p>{path}</p>"]
