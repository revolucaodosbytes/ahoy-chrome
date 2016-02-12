$(document).ready( function() {

    $('#ahoy-version').text("v" + chrome.app.getDetails().version);

    $('#verSites').click( function() {
        var newURL = "https://sitesbloqueados.pt/?utm_source=ahoy&utm_medium=chrome-popup&utm_campaign=Ahoy%20Chrome";
        chrome.tabs.create({ url: newURL });
    }); 

    chrome.storage.sync.get( [ "proxy_addr" ], function( result) { 
        $("#proxyaddr").text( result.proxy_addr );    
    } )

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


    $("#forcarProxy").click( function() {
        if($(this).attr('disabled')) { // HERE
            return false;
        };

        chrome.extension.getBackgroundPage().ahoy.update_proxy( true );
        $(this).attr('disabled', "");
        
        $(".info").hide();
        $(".waiting").show();

        setTimeout( function() {

            $("#proxyaddr").text( chrome.extension.getBackgroundPage().ahoy.proxy_addr ); 
            $("#forcarProxy").attr('disabled', false);

            $(".info").show();
            $(".waiting").hide();
          
        }, 2000 );

    });

     $("#listaSites").click( function() {
        if($(this).attr('disabled')) { // HERE
            return false;
        };

        chrome.extension.getBackgroundPage().ahoy.update_site_list();
        $(this).attr('disabled', "");
        
        $(".waiting").show();

        setTimeout( function() {

            $("#listaSites").attr('disabled', false);

            $(".waiting").hide();
          
        }, 1000 );

    });

});