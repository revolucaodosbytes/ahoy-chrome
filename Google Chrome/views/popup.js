$(document).ready( function() {

    $('#ahoy-version').text("v" + chrome.app.getDetails().version);

    chrome.storage.sync.get( [ "proxy_addr" ], function( result) { 
        $("#proxyaddr").text( result.proxy_addr );    
    } )


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