/**
 * auxiliar functions
 */
function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

function parseVersionString (str) {
    if (typeof(str) != 'string') { return false; }
    var x = str.split('.');
    // parse from string or default to 0 if can't parse
    var maj = parseInt(x[0]) || 0;
    var min = parseInt(x[1]) || 0;
    var pat = parseInt(x[2]) || 0;
    return {
        major: maj,
        minor: min,
        patch: pat
    }
}

// Initialize the ahoy
var ahoy = new Ahoy();

/**
 * Alarms - Periodic Tasks
 * Updating the Local Storage with the latest info
 */

// Create the periodic alarm to fetch new sites
chrome.alarms.create( 'update_sites_and_proxy', { delayInMinutes: 30, periodInMinutes: 30 } )

// Handle the alarms

chrome.alarms.onAlarm.addListener( function (alarm) {
	if( alarm.name == 'update_sites_and_proxy' ) {
		ahoy.update_site_list();
		ahoy.update_proxy();
	}
});


function getPopup() {
    return chrome.extension.getViews( { type: "popup" } )[0];
}