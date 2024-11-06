import mpd
import os


def init_client(client):
    if client:
        try:
            client.ping()
            return client
        except mpd.base.ConnectionError:
            pass

    hostname = os.getenv("WEMPD_MPD_HOST", "localhost")
    port = int(os.getenv("WEMPD_MPD_PORT", "6600"))

    client = mpd.MPDClient()
    client.connect(hostname, port)

    sock_name = client._sock.getpeername()
    print(f"Connected to mpd on: {sock_name[0]}:{sock_name[1]}")
    print(f"MPD version: {client.mpd_version}")
    return client


def remove_path_prefix(path):
    PREFIX = os.getenv("WEMPD_PATH_PREFIX", "/mpd")
    if path.startswith(PREFIX):
        new_path = path[len(PREFIX) :]
        if not new_path:
            new_path = "/"
        return new_path
    return path


def get_status(client):
    sock_name = client._sock.getpeername()
    return {
        "status": client.status(),
        "currentsong": client.currentsong(),
        "connection": f"{sock_name[0]}:{sock_name[1]}",
        "queue": list_queue(client),
        "version": client.mpd_version,
    }


def info_pairs(data, allowed_fields=None):
    cmd = []
    fields = {
        "artist",
        "albumartist",
        "album",
        "title",
        "name",
        "file",
        "group",
        "genre",
        "originaldate",
        "label",
    }
    if not allowed_fields:
        allowed_fields = fields

    for what in fields.intersection(allowed_fields or set()):
        if what in data and data[what] is not None:
            cmd += [what, data[what]]

    return cmd


def list_artists(client):
    return [a["artist"] for a in client.list("artist")]


def list_albumartists(client):
    return [a["albumartist"] for a in client.list("albumartist")]


def list_albums(client, query):
    pairs = info_pairs(query, ("artist", "albumartist"))
    return [a["album"] for a in client.list("album", *pairs)]


def simplify_title_list(titles):
    return [
        {
            "track": s.get("track"),
            "title": s.get("title"),
            "name": s.get("name"),
            "file": s.get("file"),
            "artist": s.get("artist"),
            "albumartist": s.get("albumartist"),
            "album": s.get("album"),
        }
        for s in titles
    ]


def list_titles(client, query):
    if "playlist" in query:
        titles = client.listplaylistinfo(query["playlist"])

    else:
        pairs = info_pairs(
            query, ("artist", "albumartist", "album", "genre", "originaldate", "label")
        )
        if pairs:
            titles = client.find(*pairs)
        else:
            titles = client.list("title")

    return simplify_title_list(titles)


def list_queue(client):
    queue = client.playlistinfo()
    status = client.status()
    if "song" in status:
        queue[int(status["song"])]["current"] = status["state"]
    return queue


def list_playlists(client):
    return [p["playlist"] for p in client.listplaylists()]


def remove_from_queue_by_search(client, what, search):
    queue = client.playlistinfo()
    removed = 0
    for song in queue:
        if song.get(what) == search:
            client.deleteid(song["id"])
            removed += 1

    return removed


def remove_from_queue_by_id(client, ids):
    removed = 0
    for song_id in ids:
        try:
            client.delete(song_id)
            removed += 1
        except mpd.base.CommandError:
            pass

    return removed


def insert(client, query, append=False):
    start_pos = 0
    if append:
        start_pos = len(client.playlist())
    else:
        status = client.status()
        if "song" in status:
            start_pos = int(status["song"]) + 1

    count = 0
    if "playlist" in query:
        if append:
            print(query)
            client.load(query["playlist"])
        else:
            playlist = client.listplaylist(query["playlist"])
            for i, song in enumerate(playlist, start=start_pos):
                client.addid(song, i)
                count += 1

    elif query.get("file"):
        client.addid(query["file"], start_pos)
        count += 1

    else:
        pairs = info_pairs(query)
        for i, song in enumerate(client.find(*pairs), start=start_pos):
            client.addid(song["file"], i)
            count += 1

    return count
