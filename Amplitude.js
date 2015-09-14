(function (window) {
    var MessageType = {
        SessionStart: 1,
        SessionEnd: 2,
        PageView: 3,
        PageEvent: 4,
        CrashReport: 5,
        OptOut: 6
    },
    isInitialized = false,
    forwarderSettings,
    name = 'Amplitude',
    reportingService,
    id = null;

    function getIdentityTypeName(identityType) {
        return mParticle.IdentityType.getName(identityType);
    }

    function processEvent(event) {
        var reportEvent = false;

        if (isInitialized) {
            try {
                if (event.EventDataType == MessageType.PageView) {
                    reportEvent = true;
                    logPageView(event);
                }
                else if (event.EventDataType == MessageType.PageEvent) {
                    reportEvent = true;

                    if (event.EventCategory == window.mParticle.EventType.Transaction) {
                        logTransaction(event);
                    }
                    else {
                        logEvent(event);
                    }
                }

                if (reportEvent && reportingService) {
                    reportingService(id, event);
                }

                return 'Successfully sent to ' + name;
            }
            catch (e) {
                return 'Failed to send to: ' + name + ' ' + e;
            }
        }

        return 'Can\'t send to forwarder ' + name + ', not initialized';
    }

    function setUserIdentity(id, type) {
        if (isInitialized) {
            if (type == window.mParticle.IdentityType.CustomerId) {
                amplitude.setUserId(id);
            }
            else {
                setUserAttribute(getIdentityTypeName(type), id);
            }
        }
        else {
            return 'Can\'t call setUserIdentity on forwarder ' + name + ', not initialized';
        }
    }

    function setUserAttribute(key, value) {
        if (isInitialized) {
            try {
                var attributeDict = {};
                attributeDict[key] = value;
                amplitude.setUserProperties(attributeDict);
                return 'Successfully called setUserProperties API on ' + name;
            }
            catch (e) {
                return 'Failed to call SET setUserProperties on ' + name + ' ' + e;
            }
        }
        else {
            return 'Can\'t call setUserAttribute on forwarder ' + name + ', not initialized';
        }
    }

    function setOptOut(isOptingOut) {
        if (isInitialized) {
            amplitude.setOptOut(isOptingOut);
        }
        else {
            return 'Can\'t call setOptOut on forwarder ' + name + ', not initialized';
        }
    }

    function logPageView(data) {
        if (data.EventAttributes) {
            amplitude.logEvent("Viewed " + data.EventName, data.EventAttributes);
        }
        else {
            amplitude.logEvent("Viewed " + data.EventName);
        }
    }

    function logEvent(data) {
        if (data.EventAttributes) {
            amplitude.logEvent(data.EventName, data.EventAttributes);
        }
        else {
            amplitude.logEvent(data.EventName);
        }
    }

    function logTransaction(data) {
        if (!data.EventAttributes ||
            !data.EventAttributes.$MethodName ||
            !data.EventAttributes.$MethodName === 'LogEcommerceTransaction') {
            // User didn't use logTransaction method, so just log normally
            logEvent(data);
            return;
        }

        amplitude.logRevenue(
            data.EventAttributes.RevenueAmount,
            data.EventAttributes.ProductQuantity,
            data.EventAttributes.ProductSKU.toString()
        );
    }

    function initForwarder(settings, service, moduleId) {
        var ampSettings;

        forwarderSettings = settings;
        reportingService = service;
        id = moduleId;

        try {
            (function (e, t) {
                var r = e.amplitude || {}; var n = t.createElement("script"); n.type = "text/javascript";
                n.async = true; n.src = "https://d24n15hnbwhuhn.cloudfront.net/libs/amplitude-2.2.1-min.gz.js";
                var s = t.getElementsByTagName("script")[0]; s.parentNode.insertBefore(n, s); r._q = []; function a(e) {
                    r[e] = function () { r._q.push([e].concat(Array.prototype.slice.call(arguments, 0))) }
                } var i = ["init", "logEvent", "logRevenue", "setUserId", "setUserProperties", "setOptOut", "setVersionName", "setDomain", "setDeviceId", "setGlobalUserProperties"];
                for (var o = 0; o < i.length; o++) { a(i[o]) } e.amplitude = r
            })(window, document);

            ampSettings = {};

            if (forwarderSettings.saveEvents) {
                ampSettings.saveEvents = forwarderSettings.saveEvents == 'True';
            }

            if (forwarderSettings.savedMaxCount) {
                ampSettings.savedMaxCount = parseInt(forwarderSettings.savedMaxCount, 10);
            }

            if (forwarderSettings.uploadBatchSize) {
                ampSettings.uploadBatchSize = parseInt(forwarderSettings.uploadBatchSize, 10);
            }

            if (forwarderSettings.includeUtm) {
                ampSettings.includeUtm = forwarderSettings.includeUtm == 'True';
            }

            if (forwarderSettings.includeReferrer) {
                ampSettings.includeReferrer = forwarderSettings.includeReferrer == 'True';
            }

            amplitude.init(forwarderSettings.apiKey, null, ampSettings);
            isInitialized = true;

            return 'Successfully initialized: ' + name;
        }
        catch (e) {
            return 'Failed to initialize: ' + name;
        }
    }

    if (!window || !window.mParticle || !window.mParticle.addForwarder) {
        return;
    }

    window.mParticle.addForwarder({
        name: name,
        init: initForwarder,
        process: processEvent,
        setUserIdentity: setUserIdentity,
        setUserAttribute: setUserAttribute,
        setOptOut : setOptOut
    });

})(window);