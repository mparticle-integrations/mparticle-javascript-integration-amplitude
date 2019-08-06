var mParticle = require('@mparticle/web-sdk');

mParticle.addForwarder = function (forwarder) {
    mParticle.forwarder = new forwarder.constructor();
};

require('../Amplitude.js');

var amp = function () {
    var instance,
        self = this;

    this.settings = {};
    this.instances = {};

    this.getInstance = function (instanceName) {
        if (!instanceName) {
            instanceName = 'default';
        }

        if (this.instances[instanceName]) {
            return this.instances[instanceName];
        } else if (instanceName === 'default') {
            instance = new ampClient('default');
        } else {
            instance = new ampClient(instanceName);
        }

        this.instances[instanceName] = instance;

        return instance;
    };

    this.Revenue = function () {
        return {
            setPrice: function (price) {
                this.price = price;
                return this;
            },

            setEventProperties: function (eventAttributes) {
                this.eventAttributes = eventAttributes;
                return this;
            }
        };
    };

    this.reset = function () {
        self.settings = {};
        self.instances = {};
    };
};

var ampClient = function () {
    var self = this;

    this.init = function (key, arg1, settings) {
        self.settings = settings;
        self.eventName = null;
        self.attrs = null;
        self.amount = null;
        self.quantity = null;
        self.sku = null;
        self.props = null;
        self.isOptingOut = null;
        self.userId = null;
    };

    this.logRevenue = function (amount, quantity, sku) {
        self.amount = amount;
        self.quantity = quantity;
        self.sku = sku;
    };

    this.logRevenueV2 = function (RevenueObj) {
        self.revenueObj = RevenueObj;
    };

    this.logEvent = function (name, attrs) {
        self.eventName = name;
        self.attrs = attrs;
    };

    this.setOptOut = function (isOptingOut) {
        self.isOptingOut = isOptingOut;
    };

    this.setUserProperties = function (props) {
        self.props = self.props || {};
        for (var key in props) {
            self.props[key] = props[key];
        }
    };

    this.setUserId = function (id) {
        self.userId = id;
    };

    this.reset = function () {
        self.eventName = null;
        self.attrs = null;
        self.amount = null;
        self.quantity = null;
        self.sku = null;
        self.props = null;
        self.isOptingOut = null;
        self.userId = null;
    };
};

window.amplitude = new amp();

/* eslint-disable no-undef*/

describe('Default amplitude settings', function () {
    var MessageType = {
            SessionStart: 1,
            SessionEnd: 2,
            PageView: 3,
            PageEvent: 4,
            CrashReport: 5,
            OptOut: 6,
            Commerce: 16
        },
        EventType = {
            Unknown: 0,
            Navigation: 1,
            Location: 2,
            Search: 3,
            Transaction: 4,
            UserContent: 5,
            UserPreference: 6,
            Social: 7,
            Other: 8,
            Media: 9,
            getName: function () {
                return 'blahblah';
            }
        },
        ProductActionType = {
            Unknown: 0,
            AddToCart: 1,
            RemoveFromCart: 2,
            Checkout: 3,
            CheckoutOption: 4,
            Click: 5,
            ViewDetail: 6,
            Purchase: 7,
            Refund: 8,
            AddToWishlist: 9,
            RemoveFromWishlist: 10
        },
        IdentityType = {
            Other: 0,
            CustomerId: 1,
            Facebook: 2,
            Twitter: 3,
            Google: 4,
            Microsoft: 5,
            Yahoo: 6,
            Email: 7,
            Alias: 8,
            FacebookCustomAudienceId: 9,
            getName: function (type) {
                for (key in IdentityType) {
                    if (IdentityType[key] === type) {
                        return key;
                    }
                }
            }
        },
        ReportingService = function () {
            var self = this;

            this.id = null;
            this.event = null;

            this.cb = function (forwarder, event) {
                self.id = forwarder.id;
                self.event = event;
            };

            this.reset = function () {
                self.id = null;
                self.event = null;
            };
        },
        reportService = new ReportingService(),
        mockXHR = {
            open: jest.fn(),
            send: jest.fn(),
            setRequestHeader: jest.fn(),
            readyState: 4,
            responseText: JSON.stringify(
                []
            )
        };

    beforeAll(function () {
        // mParticle.EventType = EventType;
        // mParticle.ProductActionType = ProductActionType;
        // mParticle.IdentityType = IdentityType;
        mParticle.Identity = {
            getCurrentUser: function () {
                return {
                    getMPID: function () {
                        return '123';
                    },
                    getUserIdentities: function () {
                        return {
                            userIdentities: {
                                customerid: '123'
                            }
                        };
                    },
                    getAllUserAttributes: function () {
                        return {};
                    },
                    getConsentState: function () {
                        return {
                            getGDPRConsentState: function () {
                                return {};
                            }
                        };
                    }
                };
            }
        };
    });

    beforeEach(function () {
        window.amplitude.reset();
        var config = {
            requestConfig: false,
            workspaceToken: 'fakeToken',
            identityCallback: function () { }
        };
        mParticle.forwarder.init({
            saveEvents: 'True',
            savedMaxCount: 20,
            uploadBatchSize: 5,
            includeUtm: 'False',
            includeReferrer: 'True',
            instanceName: 'newInstance'
        }, reportService.cb, true);

        var oldXMLHttpRequest = window.XMLHttpRequest;
        window.XMLHttpRequest = jest.fn(function () {
            return mockXHR;
        });

        mParticle.init('faketoken', config);
    });

    test('should have created an instance with name \'newInstance\'', function () {
        var instanceNames = Object.keys(amplitude.instances);

        expect(instanceNames).toHaveLength(1);
        expect(amplitude.instances).toHaveProperty('newInstance');
    });

    test('creates an additional instance with name \'default\' when no instanceName is passed', function () {
        mParticle.forwarder.init({
            saveEvents: 'True',
            savedMaxCount: 20,
            uploadBatchSize: 5,
            includeUtm: 'False',
            includeReferrer: 'True'
        }, reportService.cb, true);

        var instanceNames = Object.keys(amplitude.instances);

        expect(instanceNames).toHaveLength(2);
        expect(amplitude.instances).toHaveProperty('default');
        expect(amplitude.instances).toHaveProperty('newInstance');
    });

    test('should log page view', function () {
        mParticle.forwarder.process({
            EventDataType: MessageType.PageView,
            EventName: 'Test Page View',
            EventAttributes: {
                Path: 'Test'
            }
        });

        expect(amplitude.instances.newInstance).toHaveProperty('eventName', 'Viewed Test Page View');
        expect(amplitude.instances.newInstance).toHaveProperty('attrs');
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Path', 'Test');
    });

    test('should log transaction', function () {
        mParticle.forwarder.process({
            EventDataType: MessageType.PageEvent,
            EventCategory: EventType.Transaction,
            EventAttributes: {
                $MethodName: 'LogEcommerceTransaction',
                RevenueAmount: 400,
                ProductQuantity: 1,
                ProductSKU: '12345'
            }
        });

        expect(amplitude.instances.newInstance).toHaveProperty('amount', 400);
        expect(amplitude.instances.newInstance).toHaveProperty('quantity', 1);
        expect(amplitude.instances.newInstance).toHaveProperty('sku', '12345');
    });

    test('should set customer id user identity', function () {
        mParticle.forwarder.setUserIdentity('customerId1', IdentityType.CustomerId);

        expect(amplitude.instances.newInstance).toHaveProperty('userId', 'customerId1');
    });

    test('should set customerid as mpid when selected in settings', function () {
        mParticle.forwarder.init({
            userIdentification: 'mpId',
            instanceName: 'newInstance'
        }, reportService.cb, true);

        expect(amplitude.instances.newInstance).toHaveProperty('userId', '123');
    });

    test('should set userId as MPID on onUserIdentified if forwarder settings has MPID as userIdField', function () {
        var mParticleUser = {
            getMPID: function () { return 'abc'; }
        };
        mParticle.forwarder.init({
            userIdentification: 'mpId',
            instanceName: 'newInstance'
        }, reportService.cb, true);

        mParticle.forwarder.onUserIdentified(mParticleUser);

        expect(amplitude.instances.newInstance).toHaveProperty('userId', 'abc');
    });

    test('should set user attribute', function () {
        mParticle.forwarder.setUserAttribute('gender', 'male');

        expect(amplitude.instances.newInstance).toHaveProperty('props');
        expect(amplitude.instances.newInstance.props).toHaveProperty('gender', 'male');
    });

    test('should set opt out', function () {
        mParticle.forwarder.setOptOut(true);

        expect(amplitude.instances.newInstance).toHaveProperty('isOptingOut', true);
    });

    test('should parse forwarder settings', function () {
        expect(amplitude.instances.newInstance.settings).toHaveProperty('saveEvents', true);
        expect(amplitude.instances.newInstance.settings).toHaveProperty('savedMaxCount', 20);
        expect(amplitude.instances.newInstance.settings).toHaveProperty('uploadBatchSize', 5);
        expect(amplitude.instances.newInstance.settings).toHaveProperty('includeUtm', false);
        expect(amplitude.instances.newInstance.settings).toHaveProperty('includeReferrer', true);
    });

    test('should log purchase commerce events', function () {
        mParticle.forwarder.process({
            EventAttributes: {
                CustomEventAttribute: 'SomeEventAttributeValue'
            },
            EventDataType: MessageType.Commerce,
            ProductAction: {
                TransactionId: 123,
                Affiliation: 'my-affiliation',
                TotalAmount: 234,
                TaxAmount: 40,
                ShippingAmount: 10,
                CouponCode: 'WinnerChickenDinner',
                ProductActionType: ProductActionType.Purchase,
                ProductList: [
                    {
                        Sku: '12345',
                        Price: 400,
                        Quantity: 1,
                        Attributes: { CustomProductAttribute: 'Cool' }
                    }
                ]
            }
        });

        // Transaction Level Attribute
        expect(amplitude.instances.newInstance.revenueObj.eventAttributes).toHaveProperty('Transaction Id', 123);
        expect(amplitude.instances.newInstance.revenueObj.eventAttributes).toHaveProperty('Coupon Code', 'WinnerChickenDinner');
        expect(amplitude.instances.newInstance.revenueObj.eventAttributes).toHaveProperty('Affiliation', 'my-affiliation');
        expect(amplitude.instances.newInstance.revenueObj.eventAttributes).toHaveProperty('Shipping Amount', 10);
        expect(amplitude.instances.newInstance.revenueObj.eventAttributes).toHaveProperty('Tax Amount', 40);
        expect(amplitude.instances.newInstance.revenueObj.eventAttributes).toHaveProperty('CustomEventAttribute', 'SomeEventAttributeValue');
        expect(amplitude.instances.newInstance.revenueObj.eventAttributes).not.toHaveProperty('Total Amount');
        expect(amplitude.instances.newInstance.revenueObj).toHaveProperty('price', 234);

        // Product level attributes
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Id', '12345');
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Item Price', 400);
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Quantity', 1);
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Transaction Id', 123);
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('CustomEventAttribute', 'SomeEventAttributeValue');
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('CustomProductAttribute', 'Cool');
        expect(amplitude.instances.newInstance.attrs).not.toHaveProperty('Total Product Amount');
    });

    test('should log refund commerce events', function () {
        mParticle.forwarder.process({
            EventAttributes: {
                CustomEventAttribute: 'SomeEventAttributeValue'
            },
            EventDataType: MessageType.Commerce,
            ProductAction: {
                TransactionId: 123,
                Affiliation: 'my-affiliation',
                TotalAmount: 234,
                TaxAmount: 40,
                ShippingAmount: 10,
                CouponCode: 'WinnerChickenDinner',
                ProductActionType: ProductActionType.Refund,
                ProductList: [
                    {
                        Sku: '12345',
                        Price: 400,
                        Quantity: 1,
                        Attributes: { CustomProductAttribute: 'Cool' }
                    }
                ]
            }
        });

        // Transaction Level Attribute
        expect(amplitude.instances.newInstance.revenueObj.eventAttributes).toHaveProperty('Transaction Id', 123);
        expect(amplitude.instances.newInstance.revenueObj.eventAttributes).toHaveProperty('Coupon Code', 'WinnerChickenDinner');
        expect(amplitude.instances.newInstance.revenueObj.eventAttributes).toHaveProperty('Affiliation', 'my-affiliation');
        expect(amplitude.instances.newInstance.revenueObj.eventAttributes).toHaveProperty('Shipping Amount', 10);
        expect(amplitude.instances.newInstance.revenueObj.eventAttributes).toHaveProperty('Tax Amount', 40);
        expect(amplitude.instances.newInstance.revenueObj.eventAttributes).toHaveProperty('CustomEventAttribute', 'SomeEventAttributeValue');
        expect(amplitude.instances.newInstance.revenueObj.eventAttributes).not.toHaveProperty('Total Amount');
        expect(amplitude.instances.newInstance.revenueObj).toHaveProperty('price', -234);


        // Product level attributes
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Id', '12345');
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Item Price', 400);
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Quantity', 1);
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Transaction Id', 123);
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('CustomEventAttribute', 'SomeEventAttributeValue');
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('CustomProductAttribute', 'Cool');
        expect(amplitude.instances.newInstance.attrs).not.toHaveProperty('Total Product Amount');
    });

    test('should log AddToCart commerce events', function () {
        mParticle.forwarder.process({
            EventAttributes: {
                CustomEventAttribute: 'SomeEventAttributeValue'
            },
            EventDataType: MessageType.Commerce,
            ProductAction: {
                TransactionId: 123,
                Affiliation: 'my-affiliation',
                TotalAmount: 234,
                TaxAmount: 40,
                ShippingAmount: 10,
                CouponCode: 'WinnerChickenDinner',
                ProductActionType: ProductActionType.AddToCart,
                ProductList: [
                    {
                        Sku: '12345',
                        Price: 400,
                        Quantity: 1,
                        Attributes: { CustomProductAttribute: 'Cool' }
                    }
                ]
            }
        });

        // No revenue call is expected
        expect(amplitude.instances.newInstance).not.toHaveProperty('revenueObj');

        // Product level attributes
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Id', '12345');
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Item Price', 400);
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Quantity', 1);
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Transaction Id', 123);
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('CustomEventAttribute', 'SomeEventAttributeValue');
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('CustomProductAttribute', 'Cool');
        expect(amplitude.instances.newInstance.attrs).not.toHaveProperty('Total Product Amount');
    });

    test('should log RemoveFromCart commerce events', function () {
        mParticle.forwarder.process({
            EventAttributes: {
                CustomEventAttribute: 'SomeEventAttributeValue'
            },
            EventDataType: MessageType.Commerce,
            ProductAction: {
                TransactionId: 123,
                Affiliation: 'my-affiliation',
                TotalAmount: 234,
                TaxAmount: 40,
                ShippingAmount: 10,
                CouponCode: 'WinnerChickenDinner',
                ProductActionType: ProductActionType.RemoveFromCart,
                ProductList: [
                    {
                        Sku: '12345',
                        Price: 400,
                        Quantity: 1,
                        Attributes: { CustomProductAttribute: 'Cool' }
                    }
                ]
            }
        });

        // No revenue call is expected
        expect(amplitude.instances.newInstance).not.toHaveProperty('revenueObj');

        // Product level attributes
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Id', '12345');
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Item Price', 400);
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Quantity', 1);
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('Transaction Id', 123);
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('CustomEventAttribute', 'SomeEventAttributeValue');
        expect(amplitude.instances.newInstance.attrs).toHaveProperty('CustomProductAttribute', 'Cool');
        expect(amplitude.instances.newInstance.attrs).not.toHaveProperty('Total Product Amount');
    });

    test('should not log non-compatible commerce events', function () {
        mParticle.forwarder.process({
            EventDataType: MessageType.Commerce,
            ProductAction: {
                ProductActionType: ProductActionType.Checkout,
                ProductList: [
                    {
                        Sku: '12345',
                        Price: 400,
                        Quantity: 1
                    }
                ]
            }
        });

        expect(amplitude.instances.newInstance).toHaveProperty('amount', null);
    });

    test('sets default amplitude settings', function () {
        var platform = 'International Space Station';
        window.AmplitudeInitSettings = {
            platform: platform
        };
        window.amplitude.reset();
        mParticle.forwarder.init({
            saveEvents: 'True',
            savedMaxCount: 20,
            uploadBatchSize: 5,
            includeUtm: 'False',
            includeReferrer: 'True',
            instanceName: 'newInstance'
        }, function (forwarder, event) {
            self.id = forwarder.id;
            self.event = event;
        }, true);

        expect(amplitude.instances.newInstance.settings).toHaveProperty('platform', platform);
    });
});