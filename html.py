import json
from urllib.parse import quote_plus, unquote_plus

import api


def html_link(href, text, anchor=None):
    anchor = f"#{anchor}" if anchor else ""
    return f"<a href='{quote_plus(href, safe='/')}{anchor}'>{text}</a>"


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
                html_link("/mpd/status/", "Status"),
                html_link("/mpd/queue/", "Queue", anchor="current"),
                html_link("/mpd/albumartists/", "AlbumArtists"),
                html_link("/mpd/artists/", "Artists"),
                html_link("/mpd/albums/", "Albums"),
                html_link("/mpd/playlists/", "Playlists"),
            ]
        ),
        "</div>",
    ]


def handle_get(client, path, query):
    path_parts = unquote_plus(path).removeprefix("/").removesuffix("/").split("/")

    header = "Unknown?"
    data = {}
    thelist = []
    if path_parts[0] == "status":
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

        volume = status["volume"]
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
        ]

    elif path_parts[0] == "queue":
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
            href = f"../albumartists/{artist}/{album}/{title}"
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
                        html_link(href, title) + " " + play_now,
                        f"{artist} - {album}",
                    ]
                )
                + "</li>"
            )
        thelist.append("</ol>")
        return thelist

    elif path_parts[0] == "search":
        query = query.get("s")

        header = "Search Results"
        data = None
        thelist = []
        if query and len(query) >= 3:
            thelist.append("<ul>")
            for song in sorted(client.search("any", query), key=lambda x: x["title"]):
                artist_type = "albumartists" if "albumartist" in song else "artists"
                href = "/".join(
                    [
                        "..",
                        artist_type,
                        song.get("albumartist", song.get("artist")),
                        song["album"],
                        song["title"],
                    ]
                )
                thelist.append(
                    "<li>"
                    + html_link(href, song["title"])
                    + f"<br/>{song['artist']} - {song['album']}</li>"
                )
            thelist.append("</ul>")

    elif path_parts[0] == "playlists":
        if len(path_parts) == 1:
            header = "Playlists"
            data = {}
            thelist = [
                "<ul>",
                *[
                    "<li>" + html_link(f"{a}/", a) + "</li>"
                    for a in api.list_playlists(client)
                ],
                "</ul>",
            ]

        elif len(path_parts) == 2:
            header = " / ".join([html_link("../", "Playlists"), path_parts[1]])
            data = {"playlist": path_parts[1]}
            thelist = ["<ul>"]
            for song in api.list_titles(client, {"playlist": path_parts[1]}):
                name = song.get("title")
                if not name:
                    name = song.get("name")
                if not name:
                    name = song.get("file")
                thelist.append(f"<li>{name}</li>")
            thelist.append("</ul>")

    elif path_parts[0] == "albumartists" or path_parts[0] == "artists":
        artist_type = "albumartist" if path_parts[0] == "albumartists" else "artist"

        if len(path_parts) == 1:
            list_func = (
                api.list_albumartists
                if path_parts[0] == "albumartists"
                else api.list_artists
            )
            header = path_parts[0].title()
            data = {}
            thelist = [
                "<ul>",
                *["<li>" + html_link(f"{a}/", a) + "</li>" for a in list_func(client)],
                "</ul>",
            ]

        elif len(path_parts) == 2:
            header = " / ".join(
                [html_link("../", path_parts[0].title()), path_parts[1]]
            )
            data = {"artist": path_parts[1]}
            thelist = [
                "<ul>",
                "<li>" + html_link("tracks/", "All") + "</li>",
                *[
                    "<li>" + html_link(f"{a}/", a) + "</li>"
                    for a in api.list_albums(
                        client,
                        {artist_type: path_parts[1]},
                    )
                ],
                "</ul>",
            ]

        elif len(path_parts) == 3:
            track_listing = path_parts[2] == "tracks"
            header = " / ".join(
                [
                    html_link("../../", path_parts[0].title()),
                    html_link("../", path_parts[1]),
                    path_parts[2],
                ]
            )
            data = {
                artist_type: path_parts[1],
                "album": None if track_listing else path_parts[2],
            }

            thelist = ["<ul>" if track_listing else "<ol>"]
            sort_func = lambda a: a["title"] if track_listing else int(a["track"])
            for a in sorted(api.list_titles(client, data), key=sort_func):
                value = a["track"]
                link = html_link(f"{a['title']}", a["title"])
                thelist.append(f"<li value='{value}'>{link}</li>")
            thelist.append("</ul>" if track_listing else "</ol>")

        elif len(path_parts) == 4:
            header = " / ".join(
                [
                    html_link("../../", path_parts[0].title()),
                    html_link("../", path_parts[1]),
                    html_link(".", path_parts[2]),
                    path_parts[3],
                ]
            )
            data = {
                artist_type: path_parts[1],
                "album": None if path_parts[2] == "tracks" else path_parts[2],
                "title": path_parts[3],
            }
            song_info = client.find(*api.info_pairs(data))[0]

            thelist = ["<table>"]
            artist = song_info.get("albumartist", song_info.get("artist"))
            artist_type = "albumartists" if "albumartist" in song_info else "artists"
            for key, value in sorted(song_info.items()):
                href = {
                    "artist": f"/mpd/artists/{value}/",
                    "albumartist": f"/mpd/albumartists/{value}/",
                    "album": f"/mpd/{artist_type}/{artist}/{value}/",
                    "title": f"/mpd/{artist_type}/{artist}/{song_info['album']}/{value}",
                }.get(key)
                if href:
                    value = html_link(href, value)
                thelist.append(f"<tr><td>{key}</td><td>{value}</td></tr>")
            thelist.append("</table>")

        else:
            return ["<h1>Error</h1>", f"<p>Unrecognised request: {path}</p>"]

    elif path_parts[0] == "albums":
        if len(path_parts) == 1:
            header = "Albums"
            data = {}
            thelist = [
                "<ul>",
                *[
                    "<li>" + html_link(f"{a}/", a) + "</li>"
                    for a in api.list_albums(client, {})
                ],
                "</ul>",
            ]

        if len(path_parts) == 2:
            header = " / ".join(
                [
                    html_link("../", path_parts[0].title()),
                    path_parts[1],
                ]
            )
            data = {"album": path_parts[1]}
            thelist = [
                "<ol>",
                *[
                    f"<li value='{a['track']}'>"
                    + html_link(f"{a['title']}", a["title"])
                    + "</li>"
                    for a in api.list_titles(client, data)
                ],
                "</ol>",
            ]

        if len(path_parts) == 3:
            header = " / ".join(
                [
                    html_link("../", "Albums"),
                    html_link(".", path_parts[1]),
                    path_parts[2],
                ]
            )
            data = {"album": path_parts[1], "title": path_parts[2]}
            song_info = client.find(*api.info_pairs(data))[0]
            thelist = [
                "<table>",
                *[
                    f"<tr><td>{key}</td><td>{value}</td></tr>"
                    for key, value in sorted(song_info.items())
                ],
                "</table>",
            ]

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
