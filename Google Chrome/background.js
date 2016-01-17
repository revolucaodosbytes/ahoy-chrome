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


