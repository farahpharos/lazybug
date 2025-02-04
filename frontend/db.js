if (BROWSER_EXTENSION) {
    try {
        importScripts('dexie.min.js');
        importScripts('dexie-export-import.js');
    } catch (e) {
        console.error(e);
    }
}

const PERSONAL_DB_VERSIONS = {
    '1': function(personalDb) {
        personalDb.version(1).stores({
            states: 'id',
            other: 'id',
            log: '[captionId+captionHash+sessionTime], sessionTime, captionHash, *eventIds, synced',
        });
    },
    '2': function(personalDb) {
        // Add WPS auto pause options
        personalDb.version(2).stores({
            other: 'id',
        }).upgrade(trans => {
            return trans.other.toCollection().modify(item => {
                if (item.id === 'options') {
                    item.value.autoPause = item.value.autoPause ? 'basic' : 'off';
                    item.value.WPSThreshold = 2.0;
                }
            });
        });
    },
    '3': function(personalDb) {
        // Move showName, seaonName and episodeName from individual events to the session data
        personalDb.version(3).stores({
            log: '[captionId+captionHash+sessionTime], sessionTime, captionHash, *eventIds, synced',
        }).upgrade(trans => {
            return trans.log.toCollection().modify(item => {
                let [showName, seasonName, episodeName] = [null, null, null];
                for (let i = 0; i < item.eventIds.length; i++) {
                    if (item.eventIds[i] === reverseEventsMap[item.eventIds[i]].startsWith('EVENT_STAR_')) {
                        const eventData = item.eventData[i];
                        const state = eventData[eventData.length-1];
                        showName = state.showName;
                        seasonName = state.seasonName;
                        episodeName = state.episodeName;
                        delete state.showName;
                        delete state.seasonName;
                        delete state.episodeName;
                    }
                }

                item.showName = showName;
                item.seasonName = seasonName;
                item.episodeName = episodeName;
            });
        });
    },
    '4': function(personalDb) {
        // Add "doneIntro" flag store in options, default is "false"
        personalDb.version(4).stores({
            other: 'id',
        }).upgrade(trans => {
            return trans.other.toCollection().modify(item => {
                if (item.id === 'options') {
                    item.value.doneIntro = false;
                }
            });
        });
    },
    '5': function(personalDb) {
        // Add "useSmartSubtitles" flag store in options, default is "true"
        personalDb.version(5).stores({
            other: 'id',
        }).upgrade(trans => {
            return trans.other.toCollection().modify(item => {
                if (item.id === 'options') {
                    item.value.useSmartSubtitles = true;
                }
            });
        });
    },
    '6': function(personalDb) {
        // Add "show" flags in options, default is "true" for all
        personalDb.version(6).stores({
            other: 'id',
        }).upgrade(trans => {
            return trans.other.toCollection().modify(item => {
                if (item.id === 'options') {
                    item.value.show = {
                        hz: true,
                        py: true,
                        tr: true,
                        translation: true,
                    };
                }
            });
        });
    },
};

function initPersonalDb(untilVersion = null, name = 'lazybug-personal') {
    const personalDb = new Dexie(name);
    applyDbVersions(personalDb, PERSONAL_DB_VERSIONS, null, untilVersion);
    return personalDb;
}

function applyDbVersions(db, dbVersions, fromVersion = null, untilVersion = null) {
    let versionNumbers = Object.keys(dbVersions).map((v) => parseInt(v));
    versionNumbers.sort(function(a, b) {
      return a - b;
    });

    for (const version of versionNumbers) {
        if (fromVersion !== null && version < fromVersion) continue;
        if (untilVersion !== null && version > untilVersion) continue;
        console.log('Applying database version', version, 'for db', db.name);
        dbVersions[version.toString()](db);
    }
}

function getLatestDbVersion() {
    let versionNumbers = Object.keys(PERSONAL_DB_VERSIONS).map((v) => parseInt(v));
    return Math.max(...versionNumbers);
}

function initCacheDb() {
    const cacheDb = new Dexie('lazybug-cache');
    cacheDb.version(1).stores({
        network: 'id',
    });

    return cacheDb;
}
