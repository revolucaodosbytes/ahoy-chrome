var config = {
    mode: "pac_script",
    pacScript: {
        data: "function FindProxyForURL(url, host) {\n" +
                "  if (host == 'thepiratebay.se')\n" +
                "    return 'PROXY 177.71.192.151:80';\n" +
                "  return 'DIRECT';\n" +
                "}"
    }
};
chrome.proxy.settings.set({value: config, scope: 'regular'},function() {});