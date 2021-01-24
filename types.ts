interface whitelistRequest {
    id: string,
    username: string
}

interface userSessionInfo {
    username: string,
    joined: number
}

interface queryFullStat {
    type: number,
    sessionId: number,
    hostname: string,
    gametype: string,
    game_id: string,
    version: string,
    plugins: string,
    map: string,
    numplayers: string,
    maxplayers: string,
    hostport: string,
    hostip: string,
    player_: Array<string>,
    from: {
        address: string,
        port: number
    }
}