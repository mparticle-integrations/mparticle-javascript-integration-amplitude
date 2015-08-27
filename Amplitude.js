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
    name = 'Amplitude';

    function getIdentityTypeName(identityType) {
        switch (identityType) {
            case window.mParticle.IdentityType.CustomerId:
                return 'Customer ID';
            case window.mParticle.IdentityType.Facebook:
                return 'Facebook ID';
            case window.mParticle.IdentityType.Twitter:
                return 'Twitter ID';
            case window.mParticle.IdentityType.Google:
                return 'Google ID';
            case window.mParticle.IdentityType.Microsoft:
                return 'Microsoft ID';
            case window.mParticle.IdentityType.Yahoo:
                return 'Yahoo ID';
            case window.mParticle.IdentityType.Email:
                return 'Email';
            case window.mParticle.IdentityType.Alias:
                return 'Alias ID';
            case window.mParticle.IdentityType.FacebookCustomAudienceId:
                return 'Facebook App User ID';
            default:
                return 'Other ID';
        }
    }

    function processEvent(event) {
        if (isInitialized) {
            try {
                if (event.dt == MessageType.PageView) {
                    logPageView(event);
                }
                else if (event.dt == MessageType.PageEvent) {
                    if (event.et == window.mParticle.EventType.Transaction) {
                        logTransaction(event);
                    }
                    else {
                        logEvent(event);
                    }
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
            } else {
                setUserAttribute(getIdentityTypeName(type), id);
            }
        } else {
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
            } catch (e) {
                return 'Failed to call SET setUserProperties on ' + name + ' ' + e;
            }
        } else {
            return 'Can\'t call setUserAttribute on forwarder ' + name + ', not initialized';
        }
    }

    function setOptOut(isOptingOut) {
        if (isInitialized) {
            amplitude.setOptOut(isOptingOut);
        } else {
            return 'Can\'t call setOptOut on forwarder ' + name + ', not initialized';
        }
    }

    function logPageView(data) {
        if (data.attrs) {
            amplitude.logEvent("Viewed " + data.n, data.attrs);
        } else {
            amplitude.logEvent("Viewed " + data.n);
        }
    }

    function logEvent(data) {
        if (data.attrs) {
            amplitude.logEvent(data.n, data.attrs);
        } else {
            amplitude.logEvent(data.n);
        }
    }

    function logTransaction(data) {
        if (!data.attrs || !data.attrs.$MethodName || !data.attrs.$MethodName === 'LogEcommerceTransaction') {
            // User didn't use logTransaction method, so just log normally
            logEvent(data);
            return;
        }

        amplitude.logRevenue(
            data.attrs.RevenueAmount,
            data.attrs.ProductQuantity,
            data.attrs.ProductSKU.toString()
        );
    }

    function initForwarder(settings) {
        try {
            forwarderSettings = settings;

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