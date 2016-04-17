$(document).ready( function() {

    $('.ahoy-version').text("v" + chrome.app.getDetails().version);

    $('#verSites').click( function() {
        var newURL = "https://sitesbloqueados.pt/?utm_source=ahoy&utm_medium=chrome-popup&utm_campaign=Ahoy%20Chrome";
        chrome.tabs.create({ url: newURL });
    }); 

    chrome.storage.local.get( [ "proxy_addr" ], function( result) { 
        console.log(result);
        $("#proxyaddr").text( result.proxy_addr );    
    } )

    /*  $(".inquerito").click( function() {
        chrome.tabs.create({ url: "https://goo.gl/aIG4Re" });
    }) */

    chrome.tabs.query( { active:true, currentWindow: true }, function(tabs) {
        var currentTab = tabs[0];
        
        var activo = chrome.extension.getBackgroundPage().ahoy.is_url_in_list(currentTab.url);

        if( activo ) {
            $(".status.activo").show();
            $(".status.inactivo").hide();
        } else {
            $(".status.activo").hide();
            $(".status.inactivo").show();
        }
    })


    $("#actualizarPagina").click( function() {
        if($(this).attr('disabled')) { // HERE
            return false;
        };

        chrome.extension.getBackgroundPage().ahoy.update_proxy( true );
        chrome.extension.getBackgroundPage().ahoy.update_site_list();

        $(this).attr('disabled', "");
        
        //Set the waiting height
        $(".waiting").height( $(".info").height() );

        // Hide
        $(".info").hide();
        $(".waiting").show();

        setTimeout( function() {

            $("#proxyaddr").text( chrome.extension.getBackgroundPage().ahoy.proxy_addr ); 
            $("#forcarProxy").attr('disabled', false);

            $(".info").show();
            $(".waiting").hide();

            // Refresh the page
            chrome.tabs.reload();

            window.close();
          
        }, 2000 );

    });

    $("#desactivarAhoy").click( function() {
        chrome.extension.getBackgroundPage().ahoy.disable();
        // Refresh the page
        chrome.tabs.reload();
        
    });

    $("#activarAhoy").click( function() {
        chrome.extension.getBackgroundPage().ahoy.enable();
        // Refresh the page
        chrome.tabs.reload();
   });

});