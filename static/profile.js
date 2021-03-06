// code that is executed on every user profile
$(document).ready(function () {
    var wl = window.location;
    var newPathName = wl.pathname;
    // userID is defined in profile.html
    if (newPathName.split("/")[2] != userID) {
        newPathName = "/u/" + userID;
    }
    // if there's no mode parameter in the querystring, add it
    if (wl.search.indexOf("mode=") === -1)
        window.history.replaceState('', document.title, newPathName + "?mode=" + favouriteMode + wl.hash);
    else if (wl.pathname != newPathName)
        window.history.replaceState('', document.title, newPathName + wl.search + wl.hash);

    loadRanksPLZ(userID, favouriteMode);
    setDefaultScoreTable();
    // when an item in the mode menu is clicked, it means we should change the mode.
    $("#mode-menu>.item").click(function (e) {
        e.preventDefault();
        if ($(this).hasClass("active"))
            return;
        var m = $(this).data("mode");
        $("[data-mode]:not(.item):not([hidden])").attr("hidden", "");
        $("[data-mode=" + m + "]:not(.item)").removeAttr("hidden");
        $("#mode-menu>.active.item").removeClass("active");
        var needsLoad = $("#scores-zone>[data-mode=" + m + "][data-loaded=0]");
        if (needsLoad.length > 0)
	        initRecentActivity($("#recent-activity>div[data-mode=" + m + "]"), m)
            initialiseTopScores($("#top-scores-zone>div[data-mode=" + m + "]"), m)
            initialiseScores(needsLoad, m);
        $(this).addClass("active");
        window.history.replaceState('', document.title, wl.pathname + "?mode=" + m + wl.hash);
        loadRanksPLZ(userID, m);
    });
    initialiseAchievements();
    initialiseFriends();
    $('.kr-tab').tab()
    // load scores page for the current favourite mode
    var i = function () {
        initRecentActivity($("#recent-activity>div[data-mode=" + favouriteMode + "]"), favouriteMode)
        initialiseScores($("#scores-zone>div[data-mode=" + favouriteMode + "]"), favouriteMode)
        initialiseTopScores($("#top-scores-zone>div[data-mode=" + favouriteMode + "]"), favouriteMode)
    };
    if (i18nLoaded)
        i();
    else
        i18next.on("loaded", function () {
            i();
        });
});

function loadRanksPLZ(userid, mode) {
    api("scores/ranksget", {userid: userid, mode: mode}, (res) => {
        $("#SSHDranks").text(res.sshd);
        $("#SSranks").text(res.ss);
        $("#SHDranks").text(res.sh);
        $("#Sranks").text(res.s);
        $("#Aranks").text(res.a);
    })
}

function initialiseAchievements() {
    api('users/achievements',
        {id: userID}, function (resp) {
            var achievements = resp.achievements;
            // no achievements -- show default message
            if (achievements.length === 0) {
                $("#achievements")
                    .append($("<div class='ui sixteen wide column'>")
                        .text(T("Nothing here. Yet.")));
                $("#load-more-achievements").remove();
                return;
            }

            var displayAchievements = function (limit, achievedOnly) {
                var $ach = $("#achievements").empty();
                limit = limit < 0 ? achievements.length : limit;
                var shown = 0;
                for (var i = 0; i < achievements.length; i++) {
                    var ach = achievements[i];
                    if (shown >= limit || (achievedOnly && !ach.achieved)) {
                        continue;
                    }
                    shown++;
                    $ach.append(
                        $("<div class='ui two wide column'>").append(
                            $("<img src='https://s.katori.fun/achievements/" + ach.icon + ".png' alt='" + ach.name +
                                "' class='" +
                                (!ach.achieved ? "locked-achievement" : "achievement") +
                                "'>").popup({
                                title: ach.name,
                                content: ach.description,
                                position: "bottom center",
                                distanceAway: 10
                            })
                        )
                    );
                }
                // if we've shown nothing, and achievedOnly is enabled, try again
                // this time disabling it.
                if (shown == 0 && achievedOnly) {
                    displayAchievements(limit, false);
                }
            };

            // only 8 achievements - we can remove the button completely, because
            // it won't be used (no more achievements).
            // otherwise, we simply remove the disabled class and add the click handler
            // to activate it.
            if (achievements.length <= 8) {
                $("#load-more-achievements").remove();
            } else {
                $("#load-more-achievements")
                    .removeClass("disabled")
                    .click(function () {
                        $(this).remove();
                        displayAchievements(-1, false);
                    });
            }
            displayAchievements(8, true);
        });
}


function initialiseFriends() {
    var b = $("#add-friend-button");
    if (b.length == 0) return;
    api('friends/with', {id: userID}, setFriendOnResponse);
    b.click(friendClick);
}

function setFriendOnResponse(r) {
    var x = 0;
    if (r.friend) x++;
    if (r.mutual) x++;
    setFriend(x);
}

function setFriend(i) {
    var b = $("#add-friend-button");
    b.removeClass("loading green blue red");
    switch (i) {
        case 0:
            b
                .addClass("blue")
                .attr("title", T("Add friend"))
                .html("<i class='plus icon'></i>");
            break;
        case 1:
            b
                .addClass("green")
                .attr("title", T("Remove friend"))
                .html("<i class='minus icon'></i>");
            break;
        case 2:
            b
                .addClass("red")
                .attr("title", T("Unmutual friend"))
                .html("<i class='heart icon'></i>");
            break;
    }
    b.attr("data-friends", i > 0 ? 1 : 0)
}

function friendClick() {
    var t = $(this);
    if (t.hasClass("loading")) return;
    t.addClass("loading");
    api("friends/" + (t.attr("data-friends") == 1 ? "del" : "add"), {user: +userID}, setFriendOnResponse, true);
}

var defaultScoreTable;
var recentActivityTable;

function setDefaultScoreTable() {
    defaultScoreTable = $("<table class='ui table score-table' />")
        .append(
            $("<thead />").append(
                $("<tr />").append(
                    $("<th>" + T("General info") + "</th>"),
                    $("<th>" + T("Score") + "</th>")
                )
            )
        )
        .append(
            $("<tbody />")
        )
        .append(
            $("<tfoot />").append(
                $("<tr />").append(
                    $("<th colspan=2 />").append(
                        $("<div class='ui right floated pagination menu' />").append(
                            $("<a class='disabled item load-more-button'>" + T("Load more") + "</a>").click(loadMoreClick)
                        )
                    )
                )
            )
        )
    ;
    recentActivityTable = $("<table class='ui table score-table' />")
        .append(
            $("<thead />").append(
                $("<tr />").append(
                    $("<th>" + T("Message") + "</th>"),
                    $("<th>" + T("Time") + "</th>")
                )
            )
        )
        .append(
            $("<tbody />")
        );
}

i18next.on('loaded', function (loaded) {
    setDefaultScoreTable();
});

function initialiseScores(el, mode) {
    el.attr("data-loaded", "1");
    var best = defaultScoreTable.clone(true).addClass("orange");
    var recent = defaultScoreTable.clone(true).addClass("blue");
    best.attr("data-type", "best");
    recent.attr("data-type", "recent");
    recent.addClass("no bottom margin");
    el.append($("<div class='ui segments no bottom margin' />").append(
        $("<div class='ui segment' />").append("<h2 class='ui header'>" + T("Best scores") + "</h2>", best),
        $("<div class='ui segment' />").append("<h2 class='ui header'>" + T("Recent scores") + "</h2>", recent)
    ));
    loadScoresPage("best", mode);
    loadScoresPage("recent", mode);
};

function initialiseTopScores(el, mode) {
    el.attr("data-loaded", "1");
    var topscores = defaultScoreTable.clone(true).addClass("red");
    topscores.attr("data-type", "top-scores");
    el.append($("<div class='ui segments no bottom margin' />").append(
        $("<div class='ui segment' />").append("<h2 class='ui header'>" + T("First places") + "</h2>", topscores),
    ));
    loadTopScoresPage("top-scores", mode);
};

function initRecentActivity(el, mode) {
    el.attr("data-loaded", "1");
    var recentActivity = recentActivityTable.clone(true).addClass("green");
    recentActivity.attr("data-type", "rac");
    el.append($("<div class='ui segments no bottom margin' />").append(
        $("<div class='ui segment' />").append("<h2 class='ui header'>" + T("Recent Activity") + "</h2>", recentActivity),
    ));
    loadRecentActivity("rac", mode)    
}

function loadMoreClick() {
    var t = $(this);
    if (t.hasClass("disabled"))
        return;
    t.addClass("disabled");
    var type = t.parents("table[data-type]").data("type");
    var mode = t.parents("div[data-mode]").data("mode");
    switch (type) {
      case "top-scores":
        loadTopScoresPage(type, mode)
        break;
      default:
        loadScoresPage(type, mode);
    }

}

// currentPage for each mode
var currentPage = {
    0: {best: 0, recent: 0, top: 0},
    1: {best: 0, recent: 0, top: 0},
    2: {best: 0, recent: 0, top: 0},
    3: {best: 0, recent: 0, top: 0},
};
var scoreStore = {};
var topScoreStore = {};

function loadTopScoresPage(type, mode) {
    var table = $("#top-scores-zone div[data-mode=" + mode + "] table[data-type=" + type + "] tbody");
    var page = ++currentPage[mode][type];
    api("users/first_scores", {
        mode: mode,
        p: page,
        l: 20,
        id: userID,
    }, function (r) {
        if (r.scores == null) {
            disableTopLoadMoreButton(type, mode);
            return;
        }
        r.scores.forEach(function (v, idx) {
            topScoreStore[v.id] = v;
            if (v.completed == 0) {
            } else {
                var scoreRank = getRank(mode, v.mods, v.accuracy, v.count_300, v.count_100, v.count_50, v.count_miss);
            }
            table.append($("<tr class='new score-row' data-scoreid='" + v.id + "' />").append(
                $(
                    "<td><img src='/static/ranking-icons/" + scoreRank + ".png' class='score rank' alt='" + scoreRank + "'> " +
                    escapeHTML(v.beatmap.song_name) + " <b>" + getScoreMods(v.mods) + "</b> <i>(" + v.accuracy.toFixed(2) + "%)</i><br />" +
                    "<div class='subtitle'><time class='new timeago' datetime='" + v.time + "'>" + v.time + "</time></div></td>"
                ),
                $("<td><b>" + ppOrScore(v.pp, v.score) + "</b> " + weightedPP(type, page, idx, v.pp) + (v.completed == 3 ? "<br>" + downloadStar(v.id) : "") + "</td>")
            ));
        });
        $(".new.timeago").timeago().removeClass("new");
        $(".new.score-row").click(viewTopScoreInfo).removeClass("new");
        $(".new.downloadstar").click(function (e) {
            e.stopPropagation();
        }).removeClass("new");
        var enable = true;
        if (r.scores.length != 20)
            enable = false;
        disableTopLoadMoreButton(type, mode, enable);
    });
}

function loadRecentActivity(type, mode) {
    var table = $("#recent-activity div[data-mode=" + mode + "] table[data-type=" + type + "] tbody");
    api("users/get_activity", {
        mode: mode,
        userid: userID,
    }, function (r) {
        if(!r.logs) {
        	return;
	}
        r.logs.forEach(function (v, idx) {
            table.append($("<tr class='new score-row'/>").append(
                $(
                    "<td><img src='/static/ranking-icons/" + v.rank + ".png' class='score rank' alt='" + v.rank + "'> " +
                    escapeHTML(v.body) + "<a href='https://katori.fun/b/"+v.beatmap_id+"'>"+ escapeHTML(v.song_name) + "</a> <br />"
                ),
                $("<td><time class='new timeago' datetime='" + v.time + "'>" + v.time + "</time></td>")
            ));
        });
        $(".new.timeago").timeago().removeClass("new");
        $(".new.score-row").removeClass("new");
    });
}

function loadScoresPage(type, mode) {
    var table = $("#scores-zone div[data-mode=" + mode + "] table[data-type=" + type + "] tbody");
    var page = ++currentPage[mode][type];
    console.log("loadScoresPage with", {
        page: page,
        type: type,
        mode: mode,
    });
    api("users/scores/" + type, {
        mode: mode,
        p: page,
        l: 20,
        id: userID,
    }, function (r) {
        if (r.scores == null) {
            disableLoadMoreButton(type, mode);
            return;
        }
        r.scores.forEach(function (v, idx) {
            scoreStore[v.id] = v;
            if (v.completed == 0) {
                /*
                We
                definitely
                don't
                not
                define
                it
                here
                then
                name
                the
                image
                undefined.png
                nope
                not
                us
                not
                us
                here
                at
                akatsuki
                we
                wouldn't
                dare
                do
                that
                no
                fucking
                way
                bro
                */
            } else {
                var scoreRank = getRank(mode, v.mods, v.accuracy, v.count_300, v.count_100, v.count_50, v.count_miss);
            }
            table.append($("<tr class='new score-row' data-scoreid='" + v.id + "' />").append(
                $(
                    "<td><img src='/static/ranking-icons/" + scoreRank + ".png' class='score rank' alt='" + scoreRank + "'> " +
                    escapeHTML(v.beatmap.song_name) + " <b>" + getScoreMods(v.mods) + "</b> <i>(" + v.accuracy.toFixed(2) + "%)</i><br />" +
                    "<div class='subtitle'><time class='new timeago' datetime='" + v.time + "'>" + v.time + "</time></div></td>"
                ),
                $("<td><b>" + ppOrScore(v.pp, v.score) + "</b> " + weightedPP(type, page, idx, v.pp) + (v.completed == 3 ? "<br>" + downloadStar(v.id) : "") + "</td>")
            ));
        });
        $(".new.timeago").timeago().removeClass("new");
        $(".new.score-row").click(viewScoreInfo).removeClass("new");
        $(".new.downloadstar").click(function (e) {
            e.stopPropagation();
        }).removeClass("new");
        var enable = true;
        if (r.scores.length != 20)
            enable = false;
        disableLoadMoreButton(type, mode, enable);
    });
}

function downloadStar(id) {
    return "<a href='/web/replays/" + id + "' class='new downloadstar'><i class='star icon'></i>" + T("Download") + "</a>";
}

function weightedPP(type, page, idx, pp) {
    if (type != "best" || pp == 0)
        return "";
    var perc = Math.pow(0.95, ((page - 1) * 20) + idx);
    var wpp = pp * perc;
    return "<i title='Weighted PP, " + Math.round(perc * 100) + "%'>(" + wpp.toFixed(2) + "pp)</i>";
}

function disableTopLoadMoreButton(type, mode, enable) {
    var button = $("#top-scores-zone div[data-mode=" + mode + "] table[data-type=" + type + "] .load-more-button");
    if (enable) button.removeClass("disabled");
    else button.addClass("disabled");
}

function disableLoadMoreButton(type, mode, enable) {
    var button = $("#scores-zone div[data-mode=" + mode + "] table[data-type=" + type + "] .load-more-button");
    if (enable) button.removeClass("disabled");
    else button.addClass("disabled");
}

function viewScoreInfo() {
    var scoreid = $(this).data("scoreid");
    if (!scoreid && scoreid !== 0) return;
    var s = scoreStore[scoreid];
    if (s === undefined) return;

    // data to be displayed in the table.
    var data = {
        "Points": addCommas(s.score),
        "PP": addCommas(s.pp),
        "Beatmap": "<a href='/b/" + s.beatmap.beatmap_id + "'>" + escapeHTML(s.beatmap.song_name) + "</a>",
        "Accuracy": s.accuracy + "%",
        "Max combo": addCommas(s.max_combo) + "/" + addCommas(s.beatmap.max_combo)
            + (s.full_combo ? " " + T("(full combo)") : ""),
        "Difficulty": T("{{ stars }} star", {
            stars: s.beatmap.difficulty2[modesShort[s.play_mode]],
            count: Math.round(s.beatmap.difficulty2[modesShort[s.play_mode]]),
        }),
        "Mods": getScoreMods(s.mods, true),
    };

    // hits data
    var hd = {};
    var trans = modeTranslations[s.play_mode];
    [
        s.count_300,
        s.count_100,
        s.count_50,
        s.count_geki,
        s.count_katu,
        s.count_miss,
    ].forEach(function (val, i) {
        hd[trans[i]] = val;
    });

    data = $.extend(data, hd, {
        "Ranked?": T(s.completed == 3 ? "Yes" : "No"),
        "Achieved": s.time,
        "Mode": modes[s.play_mode],
    });

    var els = [];
    $.each(data, function (key, value) {
        els.push(
            $("<tr />").append(
                $("<td>" + T(key) + "</td>"),
                $("<td>" + value + "</td>")
            )
        );
    });

    $("#score-data-table tr").remove();
    $("#score-data-table").append(els);
    $(".ui.modal").modal("show");
}

function viewTopScoreInfo() {
    var scoreid = $(this).data("scoreid");
    if (!scoreid && scoreid !== 0) return;
    var s = topScoreStore[scoreid];
    if (s === undefined) return;

    // data to be displayed in the table.
    var data = {
        "Points": addCommas(s.score),
        "PP": addCommas(s.pp),
        "Beatmap": "<a href='/b/" + s.beatmap.beatmap_id + "'>" + escapeHTML(s.beatmap.song_name) + "</a>",
        "Accuracy": s.accuracy + "%",
        "Max combo": addCommas(s.max_combo) + "/" + addCommas(s.beatmap.max_combo)
            + (s.full_combo ? " " + T("(full combo)") : ""),
        "Difficulty": T("{{ stars }} star", {
            stars: s.beatmap.difficulty2[modesShort[s.play_mode]],
            count: Math.round(s.beatmap.difficulty2[modesShort[s.play_mode]]),
        }),
        "Mods": getScoreMods(s.mods, true),
    };

    // hits data
    var hd = {};
    var trans = modeTranslations[s.play_mode];
    [
        s.count_300,
        s.count_100,
        s.count_50,
        s.count_geki,
        s.count_katu,
        s.count_miss,
    ].forEach(function (val, i) {
        hd[trans[i]] = val;
    });

    data = $.extend(data, hd, {
        "Ranked?": T(s.completed == 3 ? "Yes" : "No"),
        "Achieved": s.time,
        "Mode": modes[s.play_mode],
    });

    var els = [];
    $.each(data, function (key, value) {
        els.push(
            $("<tr />").append(
                $("<td>" + T(key) + "</td>"),
                $("<td>" + value + "</td>")
            )
        );
    });

    $("#score-data-table tr").remove();
    $("#score-data-table").append(els);
    $(".ui.modal").modal("show");
}

var modeTranslations = [
    [
        "300s",
        "100s",
        "50s",
        "Gekis",
        "Katus",
        "Misses"
    ],
    [
        "GREATs",
        "GOODs",
        "50s",
        "GREATs (Gekis)",
        "GOODs (Katus)",
        "Misses"
    ],
    [
        "Fruits (300s)",
        "Ticks (100s)",
        "Droplets",
        "Gekis",
        "Droplet misses",
        "Misses"
    ],
    [
        "300s",
        "200s",
        "50s",
        "Max 300s",
        "100s",
        "Misses"
    ]
];

// helper functions copied from user.js in old-frontend
function getScoreMods(m, noplus) {
    var r = [];
    // has nc => remove dt
    if ((m & 512) == 512)
        m = m & ~64;
    // has pf => remove sd
    if ((m & 16384) == 16384)
        m = m & ~32;
    modsString.forEach(function (v, idx) {
        var val = 1 << idx;
        if ((m & val) > 0)
            r.push(v);
    });
    if (r.length > 0) {
        return (noplus ? "" : "+ ") + r.join(", ");
    } else {
        return (noplus ? T('None') : '');
    }
}

var modsString = [
    "NF",
    "EZ",
    "TS",
    "HD",
    "HR",
    "SD",
    "DT",
    "RX",
    "HT",
    "NC",
    "FL",
    "AU", // Auto.
    "SO",
    "AP", // Autopilot.
    "PF",
    "K4",
    "K5",
    "K6",
    "K7",
    "K8",
    "K9",
    "RN", // Random
    "LM", // LastMod. Cinema?
    "K9",
    "K0",
    "K1",
    "K3",
    "K2",
];

function getRank(gameMode, mods, acc, c300, c100, c50, cmiss) {
    var total = c300 + c100 + c50 + cmiss;

    // Hidden | Flashlight | FadeIn
    var hdfl = (mods & (1049608)) > 0;

    var ss = hdfl ? "SSHD" : "SS";
    var s = hdfl ? "SHD" : "S";

    switch (gameMode) {
        case 0:
        case 1:
            var ratio300 = c300 / total;
            var ratio50 = c50 / total;

            if (ratio300 == 1)
                return ss;

            if (ratio300 > 0.9 && ratio50 <= 0.01 && cmiss == 0)
                return s;

            if ((ratio300 > 0.8 && cmiss == 0) || (ratio300 > 0.9))
                return "A";

            if ((ratio300 > 0.7 && cmiss == 0) || (ratio300 > 0.8))
                return "B";

            if (ratio300 > 0.6)
                return "C";

            return "D";

        case 2:
            if (acc == 100)
                return ss;

            if (acc > 98)
                return s;

            if (acc > 94)
                return "A";

            if (acc > 90)
                return "B";

            if (acc > 85)
                return "C";

            return "D";

        case 3:
            if (acc == 100)
                return ss;

            if (acc > 95)
                return s;

            if (acc > 90)
                return "A";

            if (acc > 80)
                return "B";

            if (acc > 70)
                return "C";

            return "D";
    }
}

function ppOrScore(pp, score) {
    if (pp != 0)
        return addCommas(pp) + "pp";
    return addCommas(score);
}

function beatmapLink(type, id) {
    if (type == "s")
        return "<a href='/s/" + id + "'>" + id + '</a>';
    return "<a href='/b/" + id + "'>" + id + '</a>';
}
