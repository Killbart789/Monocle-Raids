//EAD CBR Blindings
var FortIcon = L.Icon.extend({
    options: {
        popupAnchor: [0, -10]
    },
    createIcon: function () {
        var div = document.createElement('div');
        var contents = "";

        if (this.options.hasOwnProperty("raidLvl")) {
            // Raid Marker
            contents +=  '<div class="fort-raid-marker"><div class="fort-raid">';
            // Has it hatched?
            if (this.options.raidBoss > 0) {
                contents += '<img class="fort-raid-boss" src="static/img/pk/'+this.options.raidBoss+'.png">';
            } else {
                if (this.options.raidLvl <= 2) {
                    // Normal
                    contents += '<img class="fort-raid-boss" src="static/img/eg/normal.png">';
                } else if (this.options.raidLvl <= 4) {
                    // Rare
                    contents += '<img class="fort-raid-boss" src="static/img/eg/rare.png">';
                } else {
                    // !!!!! LEGENDARY !!!!
                    contents += '<img class="fort-raid-boss" src="static/img/eg/legend.png">';
                }
            }

            // Create dots.
            var markDots = "";
            for (var i = this.options.raidLvl - 1; i >= 0; i--) {
                markDots += "&bull;";
            }

            contents += '<div class="fort-raid-lvl fort-team-'+this.options.team+'">'+markDots+'</div></div>';

            // Timer
            var hatched = (this.options.raidBoss > 0);
            contents += '<div class="fort-timer" data-expire="' + this.options.raidExp + '" data-expire-hatched="'+hatched+'">' + calculateRemainingTime(this.options.raidExp, hatched) + '</div>';

        } else {
            // Normal Marker
            contents += '<div class="fort-marker">'+
            '<img class="fort-icon" src="static/img/fr/'+this.options.team+'.png">';
        }

        if (this.options.slots > 0 && !(this.options.hasOwnProperty("raidBoss") && this.options.raidBoss !== 0)) {
             contents += '<div class="fort-slots fort-team-'+this.options.team+'">' + this.options.slots + '</div></div>';
        }

        div.innerHTML = contents;
        return div;
    },
});

var markers = {};
var overlays = {
    Gyms: L.layerGroup([])
};

function unsetHidden (event) {
    event.target.hidden = false;
}

function setHidden (event) {
    event.target.hidden = true;
}

function monitor (group, initial) {
    group.hidden = initial;
    group.on('add', unsetHidden);
    group.on('remove', setHidden);
}

monitor(overlays.Gyms, false)

function getPopupContent (raw) {
    var hatch_at = convertTimeToHuman((raw.raid_end-3600));
    var expires_at = convertTimeToHuman(raw.raid_end);

    var content = '<strong>'+raw.name+'</strong><hr/>'

    if (raw.team !== 0) {
        content += '<strong>Last Pok&eacute;mon:</strong> '+raw.pokemon_name +' - <a href="https://pokemongo.gamepress.gg/pokemon/' + raw.pokemon_id + '" target="_blank">#' + raw.pokemon_id + '</a>';
        content += '<br><strong>Slots Available:</strong> ' + raw.slots_available;
    } else {
        content += "This gym is empty... Quickly go and claim it!";
    }

    // Raid?
    if (raw.hasOwnProperty("raid_level") && raw.raid_level != 0) {
        // We have a raid.
        content += '<hr/><strong>Level '+raw.raid_level+' Raid</strong>';
        if (raw.boss_pokemon_id <= 0) //Fixed your showing hatched time for already hatched boss ;P - Lappy
        {
            content += '<br/><strong>Hatches:</strong> ' + hatch_at;
        }
        content += '<br/><strong>Ends:</strong> ' + expires_at;
        if(raw.boss_pokemon_id > 0) //Fixed your showing boss details for egg - Lappy
        {
            content += '<br/><br/><strong>Boss Pok&eacute;mon:</strong> '+raw.boss_pokemon_name +' - <a href="https://pokemongo.gamepress.gg/pokemon/' + raw.boss_pokemon_id + '" target="_blank">#' + raw.boss_pokemon_id + '</a>';
            content += '<br/><strong>CP:</strong> '+raw.cp;
            content += '<br/><strong>Moveset:</strong> '+raw.move_1+' - '+raw.move_2;
        }
    }
    content += '<hr/><strong>FFTP Gym ID: </strong>'+raw.fftpid;
    content += '<br><hr/><a font-size:12px href=https://www.google.com/maps/?daddr='+ raw.lat + ','+ raw.lon +' target="_blank" title="See in Google Maps">Get directions</a>';

    return content;
}

function convertTimeToHuman(time) {
    var date = new Date(time*1000);

    return pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
}

function FortMarker (raw) {
    // Find data needed.
    var opts = {
        slots: raw.slots_available,
        team: raw.team
    }

    // Add raid data
    if (raw.hasOwnProperty("raid_level") && raw.raid_level != 0) {
        opts.raidBoss = raw.boss_pokemon_id;
        opts.raidLvl = raw.raid_level;

        // Adjust time if needed.
        if (raw.boss_pokemon_id > 0) {
            // Expiry is raid end time.
            opts.raidExp = raw.raid_end;
        } else {
            // Set to hatch time
            opts.raidExp = raw.raid_end-3600;
        }
    }

    var icon = new FortIcon(opts);

    var marker = L.marker([raw.lat, raw.lon], {icon: icon, opacity: 1});
    marker.raw = raw;
    markers[raw.id] = marker;
    marker.on('popupopen',function popupopen (event) {
        event.popup.setContent(getPopupContent(raw));
    });
    marker.bindPopup();
    return marker;
}

var _lastmapdata = [];

function getGyms () {
    new Promise(function (resolve, reject) {
        $.get('/data.php', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        // Set data.
        _lastmapdata = data;
        // Re-render gym.
        renderGymData();
    });
}

function renderGymData () {
    var team_0 = 0;
    var team_1 = 0;
    var team_2 = 0;
    var team_3 = 0;

    for (var i = _lastmapdata.length - 1; i >= 0; i--) {
        var item = _lastmapdata[i];

        // Update counter
        if (item.team == 0) {
            team_0 += 1;
        } else if (item.team == 1) {
            team_1 += 1;
        } else if (item.team == 2) {
            team_2 += 1;
        } else if (item.team == 3) {
            team_3 += 1;
        }

        // No change since last time? Then don't do anything
        var existing = markers[item.id];
        if (typeof existing !== 'undefined') {
            if (existing.raw.sighting_id === item.sighting_id && shouldShowGym(item)) {
                continue;
            }
            existing.removeFrom(overlays.Gyms);
            markers[item.id] = undefined;
        }

        if (shouldShowGym(item)) {
            marker = FortMarker(item);
            marker.addTo(overlays.Gyms);
        }
    }

    interfaceTick();
    if (_interfaceTickInterval === null){
        _interfaceTickInterval = setInterval(interfaceTick, 1000);
    }

    // Update counter.
    $(".gym-stats").css('visibility', 'visible');
    $("#gyms-stats-0").text(team_0);
    $("#gyms-stats-1").text(team_1);
    $("#gyms-stats-2").text(team_2);
    $("#gyms-stats-3").text(team_3);
}

function shouldShowGym(item) {
    // Check team
    if (getPreference("SHOW_TEAM_"+item.team, "1") != "1") {
        return false;
    }

    // Check slot (Hatched raid overrides this)
    if (item.boss_pokemon_id == 0 && item.slots_available == 0 && getPreference("HIDE_NO_SLOT", "1") == "1") {
        return false;
    }

    // Check raid
    if (item.raid_level == 0 && getPreference("SHOW_NON_RAID", "1") != "1") {
        return false;
    }

    // Exit here if non-raid 
    if (item.raid_level == 0) {
        return true;
    }

    // Unhatched
    if (item.boss_pokemon_id == 0 && getPreference("SHOW_UNHATCHED", "1") != "1") {
        return false;
    }

    // Check level
    var raidLvl = Math.min(item.raid_level, 5);
    if (getPreference("SHOW_LVL_"+raidLvl, "1") != "1") {
        return false;
    }

    return true;
}

var map = L.map('main-map', {preferCanvas: true, zoomControl: false}).setView(_MapCoords, 13);

overlays.Gyms.addTo(map);

new L.Control.Zoom({ position: 'bottomright' }).addTo(map);

updateMapTiles();

map.whenReady(function () {
    $('.my-location').on('click', function () {
        map.locate({ enableHighAccurracy: true, setView: true });
    });
    setInterval(getGyms, 5000);
    getGyms();
});

$("#settings>ul.nav>li>a").on('click', function(){
    // Click handler for each tab button.
    $(this).parent().parent().children("li").removeClass('active');
    $(this).parent().addClass('active');
    var panel = $(this).data('panel');
    var item = $("#settings>.settings-panel").removeClass('active')
        .filter("[data-panel='"+panel+"']").addClass('active');
});

$("#settings_close_btn").on('click', function(){
    // 'X' button on Settings panel
    $("#settings").animate({
        opacity: 0
    }, 250, function(){ $(this).hide(); });
});

$('.my-settings').on('click', function () {
    // Settings button on bottom-left corner
    $("#settings").show().animate({
        opacity: 1
    }, 250);
});

$('#reset_btn').on('click', function () {
    // Reset button in Settings>More
    if (confirm("This will reset all your preferences. Are you sure?")){
        localStorage.clear();
        location.reload();
    }
});

$('#settings').on('click', '.settings-panel button:not(.btn-single)', function () {
    //Handler for each group button in every settings-panel.
    var item = $(this);
    if (item.hasClass('active')){
        return;
    }
    var id = item.data('id');
    var key = item.parent().data('group');
    var value = item.data('value');

    item.parent().children("button").removeClass("active");
    item.addClass("active");

    setPreference(key, value);

    // Refresh map data?
    if (item.data("render") !== undefined) {
        // Re-render gym.
        renderGymData();
    }
});

$('#settings').on('click', '.settings-panel .btn-single', function () {
    //Handler for each single button in every settings-panel.
    var item = $(this);
    var key = item.data('key');
    var newSetting = !item.hasClass('active');

    if (newSetting) {
        item.addClass("active");
    } else {
        item.removeClass("active");
    }

    setPreference(key, newSetting ? "1" : "0");

    // Refresh map data?
    if (item.data("render") !== undefined) {
        // Re-render gym.
        renderGymData();
    }
});

$('#settings').on('click', '.map-style', function () {
    // Handler for each map style title.
    var item = $(this);
    var styleId = item.data('style-id');
    
    // Remove selected style.
    $('.map-style').removeClass("map-style-active");
    item.addClass("map-style-active");

    // Update storage
    setPreference('MAP_STYLE', styleId);

    // Change style
    updateMapTiles();

    // Remove old map style.
    removePreference("MAP_STYLE_PREV");
});

$('body').on('click', '.style-flip', function () {

    // Get current.
    var tile_id = parseInt(getPreference("MAP_STYLE"));
    var newstyle_id = 1;

    if (tile_id == 1) {
        // Switching back to map.
        newstyle_id = getPreference("MAP_STYLE_PREV", _defaultSettings["MAP_STYLE"]);
        // Remove old map style.
        removePreference("MAP_STYLE_PREV");
    } else {
        // Save old style.
        setPreference("MAP_STYLE_PREV", tile_id);        
    }

    // Update storage
    setPreference('MAP_STYLE', newstyle_id);

    // Change style
    updateMapTiles();
});

function setSettingsDefaults(){
    $("#settings div.btn-group:not(.btn-group-single)").each(function(){
        var item = $(this);
        var key = item.data('group');
        var value = getPreference(key);
        if (value === false)
            value = "0";
        else if (value === true)
            value = "1";
        item.children("button").removeClass("active").filter("[data-value='"+value+"']").addClass("active");
    });

    $("#settings div.btn-group-single .btn-single").each(function(){
        var item = $(this);
        var key = item.data('key');
        var value = getPreference(key);
        if (value === false || value === "0")
            item.removeClass("active");
        else if (value === true || value === "1")
            item.addClass("active");
    });

    // Map style.
    $('*[data-style-id="'+getPreference('MAP_STYLE')+'"]').addClass('map-style-active');
}
setSettingsDefaults();

function getPreference(key, ret){
    return localStorage.getItem(key) ? localStorage.getItem(key) : (key in _defaultSettings ? _defaultSettings[key] : ret);
}

function setPreference(key, val){
    localStorage.setItem(key, val);
}

function removePreference(key){
    localStorage.removeItem(key);
}

$(window).scroll(function () {
    if ($(this).scrollTop() > 100) {
        $('.scroll-up').fadeIn();
    } else {
        $('.scroll-up').fadeOut();
    }
});

$("#settings").scroll(function () {
    if ($(this).scrollTop() > 100) {
        $('.scroll-up').fadeIn();
    } else {
        $('.scroll-up').fadeOut();
    }
});

$('.scroll-up').click(function () {
    $("html, body, #settings").animate({
        scrollTop: 0
    }, 500);
    return false;
});

function calculateRemainingTime(expire_at_timestamp, hatched) {
    var diff = (expire_at_timestamp - new Date().getTime() / 1000);

    if (diff < 0) {
        // Ended
        return hatched ? "Ended" : "Hatching"
    }

    var minutes = parseInt(diff / 60);
    var hours   = Math.floor(minutes / 60);
    minutes = (minutes - (hours*60));
    var seconds = parseInt(diff - (minutes * 60) - (hours * 60 * 60));
    if (hours !== 0) {
        return hours + ":" + (minutes > 9 ? "" + minutes: "0" + minutes) + ':' + (seconds > 9 ? "" + seconds: "0" + seconds);
    }
    return minutes + ':' + (seconds > 9 ? "" + seconds: "0" + seconds);
}

function interfaceTick() {
    if (getPreference("SHOW_TIMER") === "1"){
        $(".fort-timer").each(function() {
            $(this).css('visibility', 'visible');
            this.innerHTML = calculateRemainingTime($(this).data('expire'), $(this).data('expire-hatched'));
        });
    } else {
        $(".fort-timer").each(function() {
            $(this).css('visibility', 'hidden');
        });
    }

    if (getPreference("SHOW_SLOTS") === "1") {
        $(".fort-slots").each(function() {
            $(this).css('visibility', 'visible');
        });
    } else {
        $(".fort-slots").each(function() {
            $(this).css('visibility', 'hidden');
        });
    }
}

function updateMapTiles() {
    // Remove tiles.
    map.eachLayer(function(layer) {
        if (layer instanceof L.TileLayer)
            map.removeLayer(layer);
    });

    // Add new style.
    var tile_id = parseInt(getPreference("MAP_STYLE"));
    L.tileLayer(_MapProviders[tile_id], {opacity: 1, attribution: _MapProvidersAttribution[tile_id]}).addTo(map);

    // Update switcher
    if (tile_id == 1) {
        $(".style-flip").removeClass("sat-icon").addClass("map-icon");
    } else {
        $(".style-flip").removeClass("map-icon").addClass("sat-icon");
    }
}

function pad(n, width=2, z=0) {return (String(z).repeat(width) + String(n)).slice(String(n).length)}
