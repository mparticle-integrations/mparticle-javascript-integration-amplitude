/* eslint-disable no-undef*/
describe('Amplitude forwarder', function() {
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
            getName: function() {
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
            getName: function(type) {
                for (key in IdentityType) {
                    if (IdentityType[key] === type) {
                        return key;
                    }
                }
            }
        },
        ReportingService = function() {
            var self = this;

            this.id = null;
            this.event = null;

            this.cb = function(forwarder, event) {
                self.id = forwarder.id;
                self.event = event;
            };

            this.reset = function() {
                self.id = null;
                self.event = null;
            };
        },
        reportService = new ReportingService();

    before(function() {
        mParticle.EventType = EventType;
        mParticle.ProductActionType = ProductActionType;
        mParticle.IdentityType = IdentityType;
        mParticle.generateHash = function(name) {
            var hash = 0,
                i = 0,
                character;

            if (!name) {
                return null;
            }

            name = name.toString().toLowerCase();

            if (Array.prototype.reduce) {
                return name.split('').reduce(function(a, b) { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
            }

            if (name.length === 0) {
                return hash;
            }

            for (i = 0; i < name.length; i++) {
                character = name.charCodeAt(i);
                hash = ((hash << 5) - hash) + character;
                hash = hash & hash;
            }

            return hash;
        };
        mParticle.Identity = {
            getCurrentUser: function() {
                return {
                    getMPID: function() {
                        return '123';
                    }

                };
            }
        };
    });

    beforeEach(function() {
        window.amplitude.reset();
        mParticle.forwarder.init({
            saveEvents: 'True',
            savedMaxCount: 20,
            uploadBatchSize: 5,
            includeUtm: 'False',
            includeReferrer: 'True',
            instanceName: 'newInstance'
        }, reportService.cb, true);

        mParticle.init('faketoken');
    });

    it('should have created an instance with name \'newInstance\'', function(done) {
        var instanceNames = Object.keys(amplitude.instances);

        instanceNames.should.have.length(1);
        amplitude.instances.should.have.property('newInstance');

        done();
    });

    it('creates an additional instance with name \'default\' when no instanceName is passed', function(done) {
        mParticle.forwarder.init({
            saveEvents: 'True',
            savedMaxCount: 20,
            uploadBatchSize: 5,
            includeUtm: 'False',
            includeReferrer: 'True'
        }, reportService.cb, true);

        var instanceNames = Object.keys(amplitude.instances);

        instanceNames.should.have.length(2);
        amplitude.instances.should.have.property('default');
        amplitude.instances.should.have.property('newInstance');

        done();
    });

    it('should log page view', function(done) {
        mParticle.forwarder.process({
            EventDataType: MessageType.PageView,
            EventName: 'Test Page View',
            EventAttributes: {
                Path: 'Test'
            }
        });

        amplitude.instances.newInstance.should.have.property('eventName', 'Viewed Test Page View');
        amplitude.instances.newInstance.should.have.property('attrs');
        amplitude.instances.newInstance.attrs.should.have.property('Path', 'Test');

        done();
    });

    it('should log transaction', function(done) {
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

        amplitude.instances.newInstance.should.have.property('amount', 400);
        amplitude.instances.newInstance.should.have.property('quantity', 1);
        amplitude.instances.newInstance.should.have.property('sku', '12345');

        done();
    });

    it('should set customer id user identity', function(done) {
        mParticle.forwarder.setUserIdentity('customerId1', IdentityType.CustomerId);

        amplitude.instances.newInstance.should.have.property('userId', 'customerId1');

        done();
    });

    it('should set customerid as mpid when selected in settings', function(done) {
        mParticle.forwarder.init({
            userIdentification: 'mpid',
            instanceName: 'newInstance'
        }, reportService.cb, true);

        amplitude.instances.newInstance.should.have.property('userId', '123');

        done();
    });

    it('should set userId as MPID on onUserIdentified if forwarder settings has MPID as userIdField', function(done) {
        var mParticleUser = {
            getMPID: function() {return 'abc';}
        };
        mParticle.forwarder.init({
            userIdentification: 'mpid',
            instanceName: 'newInstance'
        }, reportService.cb, true);

        mParticle.forwarder.onUserIdentified(mParticleUser);

        amplitude.instances.newInstance.should.have.property('userId', 'abc');

        done();
    });

    it('should set user attribute', function(done) {
        mParticle.forwarder.setUserAttribute('gender', 'male');

        amplitude.instances.newInstance.should.have.property('props');
        amplitude.instances.newInstance.props.should.have.property('gender', 'male');

        done();
    });

    it('should set opt out', function(done) {
        mParticle.forwarder.setOptOut(true);

        amplitude.instances.newInstance.should.have.property('isOptingOut', true);

        done();
    });

    it('should parse forwarder settings', function(done) {
        amplitude.instances.newInstance.settings.should.have.property('saveEvents', true);
        amplitude.instances.newInstance.settings.should.have.property('savedMaxCount', 20);
        amplitude.instances.newInstance.settings.should.have.property('uploadBatchSize', 5);
        amplitude.instances.newInstance.settings.should.have.property('includeUtm', false);
        amplitude.instances.newInstance.settings.should.have.property('includeReferrer', true);

        done();
    });

    it('should log purchase commerce events', function(done) {
        mParticle.forwarder.process({
            EventAttributes: {
                CustomEventAttribute : 'SomeEventAttributeValue'
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
                        Attributes: { CustomProductAttribute : 'Cool' }
                    }
                ]
            }
        });

        // Transaction Level Attribute
        amplitude.instances.newInstance.revenueObj.eventAttributes.should.have.property('Transaction Id', 123);
        amplitude.instances.newInstance.revenueObj.eventAttributes.should.have.property('Coupon Code', 'WinnerChickenDinner');
        amplitude.instances.newInstance.revenueObj.eventAttributes.should.have.property('Affiliation', 'my-affiliation');
        amplitude.instances.newInstance.revenueObj.eventAttributes.should.have.property('Shipping Amount', 10);
        amplitude.instances.newInstance.revenueObj.eventAttributes.should.have.property('Tax Amount', 40);
        amplitude.instances.newInstance.revenueObj.eventAttributes.should.have.property('CustomEventAttribute', 'SomeEventAttributeValue');
        amplitude.instances.newInstance.revenueObj.eventAttributes.should.not.have.property('Total Amount');
        amplitude.instances.newInstance.revenueObj.should.have.property('price', 234);

        // Product level attributes
        amplitude.instances.newInstance.attrs.should.have.property('Id', '12345');
        amplitude.instances.newInstance.attrs.should.have.property('Item Price', 400);
        amplitude.instances.newInstance.attrs.should.have.property('Quantity', 1);
        amplitude.instances.newInstance.attrs.should.have.property('Transaction Id', 123);
        amplitude.instances.newInstance.attrs.should.have.property('CustomEventAttribute', 'SomeEventAttributeValue');
        amplitude.instances.newInstance.attrs.should.have.property('CustomProductAttribute', 'Cool');
        amplitude.instances.newInstance.attrs.should.not.property('Total Product Amount');

        done();
    });

    it('should log refund commerce events', function(done) {
        mParticle.forwarder.process({
            EventAttributes: {
                CustomEventAttribute : 'SomeEventAttributeValue'
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
                        Attributes: { CustomProductAttribute : 'Cool' }
                    }
                ]
            }
        });

        // Transaction Level Attribute
        amplitude.instances.newInstance.revenueObj.eventAttributes.should.have.property('Transaction Id', 123);
        amplitude.instances.newInstance.revenueObj.eventAttributes.should.have.property('Coupon Code', 'WinnerChickenDinner');
        amplitude.instances.newInstance.revenueObj.eventAttributes.should.have.property('Affiliation', 'my-affiliation');
        amplitude.instances.newInstance.revenueObj.eventAttributes.should.have.property('Shipping Amount', 10);
        amplitude.instances.newInstance.revenueObj.eventAttributes.should.have.property('Tax Amount', 40);
        amplitude.instances.newInstance.revenueObj.eventAttributes.should.have.property('CustomEventAttribute', 'SomeEventAttributeValue');
        amplitude.instances.newInstance.revenueObj.eventAttributes.should.not.have.property('Total Amount');
        amplitude.instances.newInstance.revenueObj.should.have.property('price', -234);


        // Product level attributes
        amplitude.instances.newInstance.attrs.should.have.property('Id', '12345');
        amplitude.instances.newInstance.attrs.should.have.property('Item Price', 400);
        amplitude.instances.newInstance.attrs.should.have.property('Quantity', 1);
        amplitude.instances.newInstance.attrs.should.have.property('Transaction Id', 123);
        amplitude.instances.newInstance.attrs.should.have.property('CustomEventAttribute', 'SomeEventAttributeValue');
        amplitude.instances.newInstance.attrs.should.have.property('CustomProductAttribute', 'Cool');
        amplitude.instances.newInstance.attrs.should.not.property('Total Product Amount');

        done();
    });

    it('should log AddToCart commerce events', function(done) {
        mParticle.forwarder.process({
            EventAttributes: {
                CustomEventAttribute : 'SomeEventAttributeValue'
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
                        Attributes: { CustomProductAttribute : 'Cool' }
                    }
                ]
            }
        });

        // No revenue call is expected
        amplitude.instances.newInstance.should.not.have.property('revenueObj');

        // Product level attributes
        amplitude.instances.newInstance.attrs.should.have.property('Id', '12345');
        amplitude.instances.newInstance.attrs.should.have.property('Item Price', 400);
        amplitude.instances.newInstance.attrs.should.have.property('Quantity', 1);
        amplitude.instances.newInstance.attrs.should.have.property('Transaction Id', 123);
        amplitude.instances.newInstance.attrs.should.have.property('CustomEventAttribute', 'SomeEventAttributeValue');
        amplitude.instances.newInstance.attrs.should.have.property('CustomProductAttribute', 'Cool');
        amplitude.instances.newInstance.attrs.should.not.property('Total Product Amount');

        done();
    });

    it('should log RemoveFromCart commerce events', function(done) {
        mParticle.forwarder.process({
            EventAttributes: {
                CustomEventAttribute : 'SomeEventAttributeValue'
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
                        Attributes: { CustomProductAttribute : 'Cool' }
                    }
                ]
            }
        });

        // No revenue call is expected
        amplitude.instances.newInstance.should.not.have.property('revenueObj');

        // Product level attributes
        amplitude.instances.newInstance.attrs.should.have.property('Id', '12345');
        amplitude.instances.newInstance.attrs.should.have.property('Item Price', 400);
        amplitude.instances.newInstance.attrs.should.have.property('Quantity', 1);
        amplitude.instances.newInstance.attrs.should.have.property('Transaction Id', 123);
        amplitude.instances.newInstance.attrs.should.have.property('CustomEventAttribute', 'SomeEventAttributeValue');
        amplitude.instances.newInstance.attrs.should.have.property('CustomProductAttribute', 'Cool');
        amplitude.instances.newInstance.attrs.should.not.property('Total Product Amount');

        done();
    });

    it('should not log non-compatible commerce events', function(done) {
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

        amplitude.instances.newInstance.should.have.property('amount', null);

        done();
    });
});

describe('Default amplitude settings', function() {
    it('sets default amplitude settings', function() {
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
        }, function(forwarder, event) {
            self.id = forwarder.id;
            self.event = event;
        }, true);

        amplitude.instances.newInstance.settings.should.have.property('platform', platform);
    });
});
