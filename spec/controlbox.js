(function (root, factory) {
    define([
        "mock",
        "utils"
        ], function (mock, utils) {
            return factory(mock, utils);
        }
    );
} (this, function (mock, utils) {
    describe("The Control Box", $.proxy(function (mock, utils) {
        beforeEach(function () {
            runs(function () {
                utils.openControlBox();
            });
        });

        it("can be opened by clicking a DOM element with class 'toggle-controlbox'", $.proxy(function () {
            runs(function () {
                utils.closeControlBox();
            });
            waits(50);
            runs(function () {
                // This spec will only pass if the controlbox is not currently
                // open yet.
                expect($("div#controlbox").is(':visible')).toBe(false);
                spyOn(this.controlboxtoggle, 'onClick').andCallThrough();
                spyOn(this.controlboxtoggle, 'showControlBox').andCallThrough();
                spyOn(converse, 'emit');
                // Redelegate so that the spies are now registered as the event handlers (specifically for 'onClick')
                this.controlboxtoggle.delegateEvents();
                $('.toggle-controlbox').click();
            }.bind(converse));
            waits(50);
            runs(function () {
                expect(this.controlboxtoggle.onClick).toHaveBeenCalled();
                expect(this.controlboxtoggle.showControlBox).toHaveBeenCalled();
                expect(this.emit).toHaveBeenCalledWith('controlBoxOpened', jasmine.any(Object));
                expect($("div#controlbox").is(':visible')).toBe(true);
            }.bind(converse));
        }, converse));

        describe("The Status Widget", $.proxy(function () {

            beforeEach(function () {
                utils.openControlBox();
            });

            it("shows the user's chat status, which is online by default", $.proxy(function () {
                var view = this.xmppstatusview;
                expect(view.$el.find('a.choose-xmpp-status').hasClass('online')).toBe(true);
                expect(view.$el.find('a.choose-xmpp-status').attr('data-value')).toBe('I am online');
            }, converse));

            it("can be used to set the current user's chat status", $.proxy(function () {
                var view = this.xmppstatusview;
                spyOn(view, 'toggleOptions').andCallThrough();
                spyOn(view, 'setStatus').andCallThrough();
                spyOn(converse, 'emit');
                view.delegateEvents(); // We need to rebind all events otherwise our spy won't be called
                runs(function () {
                    view.$el.find('a.choose-xmpp-status').click();
                    expect(view.toggleOptions).toHaveBeenCalled();
                });
                waits(250);
                runs(function () {
                    spyOn(view, 'updateStatusUI').andCallThrough();
                    view.initialize(); // Rebind events for spy
                    $(view.$el.find('.dropdown dd ul li a')[1]).click(); // Change status to "dnd"
                    expect(view.setStatus).toHaveBeenCalled();
                    expect(converse.emit).toHaveBeenCalledWith('statusChanged', 'dnd');
                });
                waits(250);
                runs($.proxy(function () {
                    expect(view.updateStatusUI).toHaveBeenCalled();
                    expect(view.$el.find('a.choose-xmpp-status').hasClass('online')).toBe(false);
                    expect(view.$el.find('a.choose-xmpp-status').hasClass('dnd')).toBe(true);
                    expect(view.$el.find('a.choose-xmpp-status').attr('data-value')).toBe('I am busy');
                }, converse));
            }, converse));

            it("can be used to set a custom status message", $.proxy(function () {
                var view = this.xmppstatusview;
                this.xmppstatus.save({'status': 'online'});
                spyOn(view, 'setStatusMessage').andCallThrough();
                spyOn(view, 'renderStatusChangeForm').andCallThrough();
                spyOn(converse, 'emit');
                view.delegateEvents(); // We need to rebind all events otherwise our spy won't be called
                view.$el.find('a.change-xmpp-status-message').click();
                expect(view.renderStatusChangeForm).toHaveBeenCalled();
                // The async testing here is used only to provide time for
                // visual feedback
                var msg = 'I am happy';
                runs (function () {
                    view.$el.find('form input.custom-xmpp-status').val(msg);
                });
                waits(250);
                runs (function () {
                    view.$el.find('form#set-custom-xmpp-status').submit();
                    expect(view.setStatusMessage).toHaveBeenCalled();
                    expect(converse.emit).toHaveBeenCalledWith('statusMessageChanged', msg);
                    expect(view.$el.find('a.choose-xmpp-status').hasClass('online')).toBe(true);
                    expect(view.$el.find('a.choose-xmpp-status').attr('data-value')).toBe(msg);
                });
            }, converse));
        }, converse));
    }, converse, mock, utils));

    describe("The Contacts Roster", $.proxy(function (mock, utils) {

        describe("Pending Contacts", $.proxy(function () {
            beforeEach($.proxy(function () {
                runs(function () {
                    converse.rosterview.model.reset();
                    utils.createContacts('pending').openControlBox();
                });
                waits(50);
                runs(function () {
                    utils.openContactsPanel();
                });
            }, converse));

            it("do not have a heading if there aren't any", $.proxy(function () {
                converse.rosterview.model.reset();
                expect(this.rosterview.$el.find('dt#pending-xmpp-contacts').css('display')).toEqual('none');
            }, converse));

            it("will have their own heading once they have been added", $.proxy(function () {
                expect(this.rosterview.$el.find('dt#pending-xmpp-contacts').css('display')).toEqual('block');
            }, converse));

            it("can be added to the roster", $.proxy(function () {
                converse.rosterview.model.reset(); // We want to manually create users so that we can spy
                spyOn(converse, 'emit');
                spyOn(this.rosterview, 'render').andCallThrough();
                runs($.proxy(function () {
                    this.roster.create({
                        jid: mock.pend_names[0].replace(/ /g,'.').toLowerCase() + '@localhost',
                        subscription: 'none',
                        ask: 'subscribe',
                        fullname: mock.pend_names[0],
                        is_last: true
                    });
                }, converse));
                waits(300);
                runs($.proxy(function () {
                    expect(converse.emit).toHaveBeenCalledWith('rosterViewUpdated');
                    expect(this.rosterview.$el.is(':visible')).toEqual(true);
                    expect(this.rosterview.render).toHaveBeenCalled();
                }, converse));
            }, converse));

            it("can be removed by the user", $.proxy(function () {
                var jid = mock.pend_names[0].replace(/ /g,'.').toLowerCase() + '@localhost';
                var view = this.rosterview.get(jid);
                spyOn(window, 'confirm').andReturn(true);
                spyOn(converse, 'emit');
                spyOn(this.connection.roster, 'remove').andCallThrough();
                spyOn(this.connection.roster, 'unauthorize');
                spyOn(this.rosterview.model, 'remove').andCallThrough();

                view.$el.find('.remove-xmpp-contact').click();
                expect(window.confirm).toHaveBeenCalled();
                expect(this.connection.roster.remove).toHaveBeenCalled();
                expect(this.connection.roster.unauthorize).toHaveBeenCalled();
                expect(this.rosterview.model.remove).toHaveBeenCalled();
                // The element must now be detached from the DOM.
                expect(view.$el.closest('html').length).toBeFalsy();
                expect(converse.emit).toHaveBeenCalledWith('rosterViewUpdated');
            }, converse));

            it("will lose their own heading once the last one has been removed", $.proxy(function () {
                var view;
                spyOn(window, 'confirm').andReturn(true);
                for (i=0; i<mock.pend_names.length; i++) {
                    view = this.rosterview.get(mock.pend_names[i].replace(/ /g,'.').toLowerCase() + '@localhost');
                    view.$el.find('.remove-xmpp-contact').click();
                }
                expect(this.rosterview.$el.find('dt#pending-xmpp-contacts').is(':visible')).toBeFalsy();
            }, converse));

            it("can be added to the roster and they will be sorted alphabetically", $.proxy(function () {
                converse.rosterview.model.reset(); // We want to manually create users so that we can spy
                var i, t, is_last;
                spyOn(converse, 'emit');
                spyOn(this.rosterview, 'render').andCallThrough();
                for (i=0; i<mock.pend_names.length; i++) {
                    is_last = i===(mock.pend_names.length-1);
                    this.roster.create({
                        jid: mock.pend_names[i].replace(/ /g,'.').toLowerCase() + '@localhost',
                        subscription: 'none',
                        ask: 'subscribe',
                        fullname: mock.pend_names[i],
                        is_last: is_last
                    });
                    expect(this.rosterview.render).toHaveBeenCalled();
                    expect(converse.emit).toHaveBeenCalledWith('rosterViewUpdated');
                    // Check that they are sorted alphabetically
                    t = this.rosterview.$el.find('dt#pending-xmpp-contacts').siblings('dd.pending-xmpp-contact').find('span').text();
                    expect(t).toEqual(mock.pend_names.slice(0,i+1).sort().join(''));
                }
            }, converse));

        }, converse));

        describe("Existing Contacts", $.proxy(function () {
            beforeEach($.proxy(function () {
                runs(function () {
                    converse.rosterview.model.reset();
                    utils.createContacts().openControlBox();
                });
                waits(50);
                runs(function () {
                    utils.openContactsPanel();
                });
            }, converse));

            it("do not have a heading if there aren't any", $.proxy(function () {
                converse.rosterview.model.reset();
                expect(this.rosterview.$el.find('dt#xmpp-contacts').css('display')).toEqual('none');
            }, converse));

            it("can be added to the roster and they will be sorted alphabetically", $.proxy(function () {
                var i, t;
                converse.rosterview.model.reset();
                spyOn(converse, 'emit');
                spyOn(this.rosterview, 'render').andCallThrough();
                for (i=0; i<mock.cur_names.length; i++) {
                    this.roster.create({
                        jid: mock.cur_names[i].replace(/ /g,'.').toLowerCase() + '@localhost',
                        subscription: 'both',
                        ask: null,
                        fullname: mock.cur_names[i],
                        is_last: i===(mock.cur_names.length-1)
                    });
                    expect(this.rosterview.render).toHaveBeenCalled();
                    expect(converse.emit).toHaveBeenCalledWith('rosterViewUpdated');
                    // Check that they are sorted alphabetically
                    t = this.rosterview.$el.find('dt#xmpp-contacts').siblings('dd.current-xmpp-contact.offline').find('a.open-chat').text();
                    expect(t).toEqual(mock.cur_names.slice(0,i+1).sort().join(''));
                }
            }, converse));

            it("will have their own heading once they have been added", $.proxy(function () {
                expect(this.rosterview.$el.find('dt#xmpp-contacts').css('display')).toEqual('block');
            }, converse));

            it("can change their status to online and be sorted alphabetically", $.proxy(function () {
                var item, view, jid, t;
                spyOn(converse, 'emit');
                spyOn(this.rosterview, 'render').andCallThrough();
                for (i=0; i<mock.cur_names.length; i++) {
                    jid = mock.cur_names[i].replace(/ /g,'.').toLowerCase() + '@localhost';
                    view = this.rosterview.get(jid);
                    spyOn(view, 'render').andCallThrough();
                    item = view.model;
                    item.set('chat_status', 'online');
                    expect(view.render).toHaveBeenCalled();
                    expect(this.rosterview.render).toHaveBeenCalled();
                    expect(converse.emit).toHaveBeenCalledWith('rosterViewUpdated');
                    // Check that they are sorted alphabetically
                    t = this.rosterview.$el.find('dt#xmpp-contacts').siblings('dd.current-xmpp-contact.online').find('a.open-chat').text();
                    expect(t).toEqual(mock.cur_names.slice(0,i+1).sort().join(''));
                }
            }, converse));

            it("can change their status to busy and be sorted alphabetically", $.proxy(function () {
                var item, view, jid, t;
                spyOn(converse, 'emit');
                spyOn(this.rosterview, 'render').andCallThrough();
                for (i=0; i<mock.cur_names.length; i++) {
                    jid = mock.cur_names[i].replace(/ /g,'.').toLowerCase() + '@localhost';
                    view = this.rosterview.get(jid);
                    spyOn(view, 'render').andCallThrough();
                    item = view.model;
                    item.set('chat_status', 'dnd');
                    expect(view.render).toHaveBeenCalled();
                    expect(this.rosterview.render).toHaveBeenCalled();
                    expect(converse.emit).toHaveBeenCalledWith('rosterViewUpdated');
                    // Check that they are sorted alphabetically
                    t = this.rosterview.$el.find('dt#xmpp-contacts').siblings('dd.current-xmpp-contact.dnd').find('a.open-chat').text();
                    expect(t).toEqual(mock.cur_names.slice(0,i+1).sort().join(''));
                }
            }, converse));

            it("can change their status to away and be sorted alphabetically", $.proxy(function () {
                var item, view, jid, t;
                spyOn(converse, 'emit');
                spyOn(this.rosterview, 'render').andCallThrough();
                for (i=0; i<mock.cur_names.length; i++) {
                    jid = mock.cur_names[i].replace(/ /g,'.').toLowerCase() + '@localhost';
                    view = this.rosterview.get(jid);
                    spyOn(view, 'render').andCallThrough();
                    item = view.model;
                    item.set('chat_status', 'away');
                    expect(view.render).toHaveBeenCalled();
                    expect(this.rosterview.render).toHaveBeenCalled();
                    expect(converse.emit).toHaveBeenCalledWith('rosterViewUpdated');
                    // Check that they are sorted alphabetically
                    t = this.rosterview.$el.find('dt#xmpp-contacts').siblings('dd.current-xmpp-contact.away').find('a.open-chat').text();
                    expect(t).toEqual(mock.cur_names.slice(0,i+1).sort().join(''));
                }
            }, converse));

            it("can change their status to xa and be sorted alphabetically", $.proxy(function () {
                var item, view, jid, t;
                spyOn(converse, 'emit');
                spyOn(this.rosterview, 'render').andCallThrough();
                for (i=0; i<mock.cur_names.length; i++) {
                    jid = mock.cur_names[i].replace(/ /g,'.').toLowerCase() + '@localhost';
                    view = this.rosterview.get(jid);
                    spyOn(view, 'render').andCallThrough();
                    item = view.model;
                    item.set('chat_status', 'xa');
                    expect(view.render).toHaveBeenCalled();
                    expect(this.rosterview.render).toHaveBeenCalled();
                    expect(converse.emit).toHaveBeenCalledWith('rosterViewUpdated');
                    // Check that they are sorted alphabetically
                    t = this.rosterview.$el.find('dt#xmpp-contacts').siblings('dd.current-xmpp-contact.xa').find('a.open-chat').text();
                    expect(t).toEqual(mock.cur_names.slice(0,i+1).sort().join(''));
                }
            }, converse));

            it("can change their status to unavailable and be sorted alphabetically", $.proxy(function () {
                var item, view, jid, t;
                spyOn(converse, 'emit');
                spyOn(this.rosterview, 'render').andCallThrough();
                for (i=0; i<mock.cur_names.length; i++) {
                    jid = mock.cur_names[i].replace(/ /g,'.').toLowerCase() + '@localhost';
                    view = this.rosterview.get(jid);
                    spyOn(view, 'render').andCallThrough();
                    item = view.model;
                    item.set('chat_status', 'unavailable');
                    expect(view.render).toHaveBeenCalled();
                    expect(this.rosterview.render).toHaveBeenCalled();
                    expect(converse.emit).toHaveBeenCalledWith('rosterViewUpdated');
                    // Check that they are sorted alphabetically
                    t = this.rosterview.$el.find('dt#xmpp-contacts').siblings('dd.current-xmpp-contact.unavailable').find('a.open-chat').text();
                    expect(t).toEqual(mock.cur_names.slice(0, i+1).sort().join(''));
                }
            }, converse));

            it("are ordered according to status: online, busy, away, xa, unavailable, offline", $.proxy(function () {
                var i;
                for (i=0; i<3; i++) {
                    jid = mock.cur_names[i].replace(/ /g,'.').toLowerCase() + '@localhost';
                    view = this.rosterview.get(jid);
                    view.model.set('chat_status', 'online');
                }
                for (i=3; i<6; i++) {
                    jid = mock.cur_names[i].replace(/ /g,'.').toLowerCase() + '@localhost';
                    view = this.rosterview.get(jid);
                    view.model.set('chat_status', 'dnd');
                }
                for (i=6; i<9; i++) {
                    jid = mock.cur_names[i].replace(/ /g,'.').toLowerCase() + '@localhost';
                    view = this.rosterview.get(jid);
                    view.model.set('chat_status', 'away');
                }
                for (i=9; i<12; i++) {
                    jid = mock.cur_names[i].replace(/ /g,'.').toLowerCase() + '@localhost';
                    view = this.rosterview.get(jid);
                    view.model.set('chat_status', 'xa');
                }
                for (i=12; i<15; i++) {
                    jid = mock.cur_names[i].replace(/ /g,'.').toLowerCase() + '@localhost';
                    view = this.rosterview.get(jid);
                    view.model.set('chat_status', 'unavailable');
                }

                var contacts = this.rosterview.$el.find('dd.current-xmpp-contact');
                for (i=0; i<3; i++) {
                    expect($(contacts[i]).attr('class').split(' ',1)[0]).toEqual('online');
                }
                for (i=3; i<6; i++) {
                    expect($(contacts[i]).attr('class').split(' ',1)[0]).toEqual('dnd');
                }
                for (i=6; i<9; i++) {
                    expect($(contacts[i]).attr('class').split(' ',1)[0]).toEqual('away');
                }
                for (i=9; i<12; i++) {
                    expect($(contacts[i]).attr('class').split(' ',1)[0]).toEqual('xa');
                }
                for (i=12; i<15; i++) {
                    expect($(contacts[i]).attr('class').split(' ',1)[0]).toEqual('unavailable');
                }
                for (i=15; i<mock.cur_names.length; i++) {
                    expect($(contacts[i]).attr('class').split(' ',1)[0]).toEqual('offline');
                }
            }, converse));
        }, converse));

        describe("Requesting Contacts", $.proxy(function () {
            beforeEach($.proxy(function () {
                runs(function () {
                    converse.rosterview.model.reset();
                    utils.createContacts('requesting').openControlBox();
                });
                waits(50);
                runs(function () {
                    utils.openContactsPanel();
                });
            }, converse));

            it("do not have a heading if there aren't any", $.proxy(function () {
                // by default the dts are hidden from css class and only later they will be hidden
                // by jQuery therefore for the first check we will see if visible instead of none
                converse.rosterview.model.reset();
                expect(this.rosterview.$el.find('dt#xmpp-contact-requests').is(':visible')).toEqual(false);
            }, converse));

            it("can be added to the roster and they will be sorted alphabetically", $.proxy(function () {
                converse.rosterview.model.reset(); // We want to manually create users so that we can spy
                var i, children;
                var names = [];
                spyOn(converse, 'emit');
                spyOn(this.rosterview, 'render').andCallThrough();
                spyOn(this.controlboxtoggle, 'showControlBox').andCallThrough();
                for (i=0; i<mock.req_names.length; i++) {
                    this.roster.create({
                        jid: mock.req_names[i].replace(/ /g,'.').toLowerCase() + '@localhost',
                        subscription: 'none',
                        ask: null,
                        requesting: true,
                        fullname: mock.req_names[i],
                        is_last: i===(mock.req_names.length-1)
                    });
                    expect(this.rosterview.render).toHaveBeenCalled();
                    // Check that they are sorted alphabetically
                    children = this.rosterview.$el.find('dt#xmpp-contact-requests').siblings('dd.requesting-xmpp-contact').children('span');
                    names = [];
                    children.each(function (idx, item) {
                        if (!$(item).hasClass('request-actions')) {
                            names.push($(item).text().replace(/^\s+|\s+$/g, ''));
                        }
                    });
                    expect(names.join('')).toEqual(mock.req_names.slice(0,i+1).sort().join(''));
                    // When a requesting contact is added, the controlbox must
                    // be opened.
                    expect(this.controlboxtoggle.showControlBox).toHaveBeenCalled();
                    expect(converse.emit).toHaveBeenCalledWith('rosterViewUpdated');
                }
            }, converse));

            it("will have their own heading once they have been added", $.proxy(function () {
                expect(this.rosterview.$el.find('dt#xmpp-contact-requests').css('display')).toEqual('block');
            }, converse));

            it("can have their requests accepted by the user", $.proxy(function () {
                // TODO: Testing can be more thorough here, the user is
                // actually not accepted/authorized because of
                // mock_connection.
                var jid = mock.req_names.sort()[0].replace(/ /g,'.').toLowerCase() + '@localhost';
                var view = this.rosterview.get(jid);
                spyOn(this.connection.roster, 'authorize');
                spyOn(view, 'acceptRequest').andCallThrough();
                view.delegateEvents(); // We need to rebind all events otherwise our spy won't be called
                var accept_button = view.$el.find('.accept-xmpp-request');
                accept_button.click();
                expect(view.acceptRequest).toHaveBeenCalled();
                expect(this.connection.roster.authorize).toHaveBeenCalled();
            }, converse));

            it("can have their requests denied by the user", $.proxy(function () {
                var jid = mock.req_names.sort()[1].replace(/ /g,'.').toLowerCase() + '@localhost';
                var view = this.rosterview.get(jid);
                spyOn(converse, 'emit');
                spyOn(this.connection.roster, 'unauthorize');
                spyOn(this.rosterview, 'removeRosterItemView').andCallThrough();
                spyOn(window, 'confirm').andReturn(true);
                spyOn(view, 'declineRequest').andCallThrough();
                view.delegateEvents(); // We need to rebind all events otherwise our spy won't be called
                var accept_button = view.$el.find('.decline-xmpp-request');
                accept_button.click();
                expect(view.declineRequest).toHaveBeenCalled();
                expect(window.confirm).toHaveBeenCalled();
                expect(this.rosterview.removeRosterItemView).toHaveBeenCalled();
                expect(this.connection.roster.unauthorize).toHaveBeenCalled();
                expect(converse.emit).toHaveBeenCalledWith('rosterViewUpdated');
                // There should now be one less contact
                expect(this.roster.length).toEqual(mock.req_names.length-1);
            }, converse));
        }, converse));

        describe("All Contacts", $.proxy(function () {
            beforeEach($.proxy(function () {
                runs(function () {
                    utils.clearBrowserStorage();
                    converse.rosterview.model.reset();
                    converse.rosterview.model.browserStorage._clear();
                    utils.createContacts('all').openControlBox();
                });
                waits(50);
                runs(function () {
                    utils.openContactsPanel();
                });
            }, converse));

            it("are saved to, and can be retrieved from, browserStorage", $.proxy(function () {
                var new_attrs, old_attrs, attrs, old_roster;
                var num_contacts = this.roster.length;
                new_roster = new this.RosterItems();
                // Roster items are yet to be fetched from browserStorage
                expect(new_roster.length).toEqual(0);

                new_roster.browserStorage = new Backbone.BrowserStorage.session(
                    b64_sha1('converse.rosteritems-dummy@localhost'));

                new_roster.fetch();
                expect(new_roster.length).toEqual(num_contacts);
                // Check that the roster items retrieved from browserStorage
                // have the same attributes values as the original ones.
                attrs = ['jid', 'fullname', 'subscription', 'ask'];
                for (i=0; i<attrs.length; i++) {
                    new_attrs = _.pluck(_.pluck(new_roster.models, 'attributes'), attrs[i]);
                    old_attrs = _.pluck(_.pluck(this.roster.models, 'attributes'), attrs[i]);
                    // Roster items in storage are not necessarily sorted,
                    // so we have to sort them here to do a proper
                    // comparison
                    expect(_.isEqual(new_attrs.sort(), old_attrs.sort())).toEqual(true);
                }
                this.rosterview.render();
            }, converse));

            afterEach($.proxy(function () {
                // Contacts retrieved from browserStorage have chat_status of
                // "offline".
                // In the next test suite, we need some online contacts, so
                // we make some online now
                for (i=0; i<5; i++) {
                    jid = mock.cur_names[i].replace(/ /g,'.').toLowerCase() + '@localhost';
                    view = this.rosterview.get(jid);
                    view.model.set('chat_status', 'online');
                }
            }, converse));
        }, converse));
    }, converse, mock, utils));

    describe("The 'Add Contact' widget", $.proxy(function (mock, utils) {
        it("opens up an add form when you click on it", $.proxy(function () {
            var panel = this.chatboxviews.get('controlbox').contactspanel;
            spyOn(panel, 'toggleContactForm').andCallThrough();
            panel.delegateEvents(); // We need to rebind all events otherwise our spy won't be called
            panel.$el.find('a.toggle-xmpp-contact-form').click();
            expect(panel.toggleContactForm).toHaveBeenCalled();
            // XXX: Awaiting more tests, close it again for now...
            panel.$el.find('a.toggle-xmpp-contact-form').click();
        }, converse));

    }, converse, mock, utils));

    describe("The Controlbox Tabs", $.proxy(function () {
        beforeEach($.proxy(function () {
            runs(function () {
                utils.closeAllChatBoxes();
            });
            waits(50);
            runs(function () {
                utils.openControlBox();
            });
        }, converse));

        it("contains two tabs, 'Contacts' and 'ChatRooms'", $.proxy(function () {
            var cbview = this.chatboxviews.get('controlbox');
            var $panels = cbview.$el.find('.controlbox-panes');
            expect($panels.children().length).toBe(2);
            expect($panels.children().first().attr('id')).toBe('users');
            expect($panels.children().first().is(':visible')).toBe(true);
            expect($panels.children().last().attr('id')).toBe('chatrooms');
            expect($panels.children().last().is(':visible')).toBe(false);
        }, converse));

        describe("chatrooms panel", $.proxy(function () {
            beforeEach($.proxy(function () {
                runs(function () {
                    utils.closeAllChatBoxes();
                });
                waits(50);
                runs(function () {
                    utils.openControlBox();
                });
            }, converse));

            it("is opened by clicking the 'Chatrooms' tab", $.proxy(function () {
                var cbview = this.chatboxviews.get('controlbox');
                var $tabs = cbview.$el.find('#controlbox-tabs');
                var $panels = cbview.$el.find('.controlbox-panes');
                var $contacts = $panels.children().first();
                var $chatrooms = $panels.children().last();
                spyOn(cbview, 'switchTab').andCallThrough();
                cbview.delegateEvents(); // We need to rebind all events otherwise our spy won't be called
                runs(function () {
                    $tabs.find('li').last().find('a').click(); // Clicks the chatrooms tab
                });
                waits(250);
                runs(function () {
                    expect($contacts.is(':visible')).toBe(false);
                    expect($chatrooms.is(':visible')).toBe(true);
                    expect(cbview.switchTab).toHaveBeenCalled();
                });
            }, converse));

            it("contains a form through which a new chatroom can be created", $.proxy(function () {
                var roomspanel = this.chatboxviews.get('controlbox').roomspanel;
                var $input = roomspanel.$el.find('input.new-chatroom-name');
                var $nick = roomspanel.$el.find('input.new-chatroom-nick');
                var $server = roomspanel.$el.find('input.new-chatroom-server');
                expect($input.length).toBe(1);
                expect($server.length).toBe(1);
                expect($('.chatroom:visible').length).toBe(0); // There shouldn't be any chatrooms open currently
                spyOn(roomspanel, 'createChatRoom').andCallThrough();
                roomspanel.delegateEvents(); // We need to rebind all events otherwise our spy won't be called
                runs(function () {
                    $input.val('Lounge');
                    $nick.val('dummy');
                    $server.val('muc.localhost');
                });
                waits('250');
                runs(function () {
                    roomspanel.$el.find('form').submit();
                    expect(roomspanel.createChatRoom).toHaveBeenCalled();
                });
                waits('250');
                runs($.proxy(function () {
                    expect($('.chatroom:visible').length).toBe(1); // There should now be an open chatroom
                }, converse));
            }, converse));
        }, converse));
    }, converse, mock, utils));
}));
