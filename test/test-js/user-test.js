function createEmail() {
    const randomString = (Math.floor( Math.random() * 100000000000000000)).toString( 32 );
    return `user-a-${randomString}@saaslet.baz`;
}

describe('it interacts with the user API', function () {
    var saaslet;
    
    const userAEmail = createEmail();
    const userAEmailNew = createEmail();
    var loginEvents = 0;
    var signupEvents = 0;
    var logoutEvents = 0;
    
    it('creates the saaslet instance', function () {
        saaslet = new Saaslet( 'ZGV2X2N1c19oN3pEdHp2QTJjV3pOQzVkWEM0MTJvLmRldl9hcHBfWW90Rm9ITzdWek10RTkzR2gtVkxqbQ' );
        assert.equal( typeof saaslet.user.login, 'function' );
        saaslet.on( 'signup', () => { signupEvents++; });
        saaslet.on( 'login', () => { loginEvents++; })
        saaslet.on( 'logout', () => { logoutEvents++; })
    });

    it( 'signs up with user a', async function(){
        assert.equal( signupEvents, 0 );
        userId = await saaslet.user.signup( userAEmail, 'password-a' );
        assert.equal( typeof userId, 'string' );
        assert.equal( signupEvents, 1 );
    });


    it( 'fails to sign up with an existing user', function( done ) {
        saaslet.user.signup( userAEmail, 'password-a' )
            .then(() => {
                assert.equal( 'it', 'should not get here' );
                done();
            }).catch( e => {
                assert.equal( e.data.error, 'user already exists' );
                assert.equal( e.status, 409 );
                done();
            });
    });

    it( 'has an established session after signup', async function() {
        const result = await saaslet.user.getInfo();
        assert.equal( typeof result.id, 'string' );
        assert.equal( typeof result.email, 'string' );
        assert.equal( typeof result.subscriptions, 'object' );
        assert.equal( result.email, userAEmail );
    });

    it( 'logs userA out ', async function() {
        assert.equal( logoutEvents, 0 );
        const result = await saaslet.user.logout( userAEmail, 'password-a' );
        assert.equal( logoutEvents, 1 );
    });

    it( 'has no session after logout', function( done ) {
        saaslet.user.getInfo()
            .then(() => {
                assert.equal( 'it', 'should not get here' );
                done();
            }).catch( e => {
                assert.equal( e.data.error, 'no session found' );
                done();
            });
    });

    it( 'returns false for isLoggedIn', async function() {
        assert.equal( (await saaslet.user.isLoggedIn() ), false );
    });

    it( 'logs userA in ', function( done ) {
        assert.equal( loginEvents, 0 );
        saaslet.user.login( userAEmail, 'password-a' ).then(q => {
            assert.equal( loginEvents, 1 );
            done();
        }); 
    });

    it( 'has an established session after login', async function() {
        const result = await saaslet.user.getInfo();
        assert.equal( typeof result.id, 'string' );
        assert.equal( typeof result.email, 'string' );
        assert.equal( typeof result.subscriptions, 'object' );
        assert.equal( result.email, userAEmail );
    });

    it( 'returns true for isLoggedIn', async function() {
        assert.equal( (await saaslet.user.isLoggedIn() ), true );
    });

    it( 'sets a user parameter', async function() {
        const result = await saaslet.user.set( 'key-a', 'val-a' );
        assert.equal( result.status, 200 );
    });

    it( 'retrieves a user parameter', async function() {
        const val = await saaslet.user.get( 'key-a' );
        assert.equal( val, 'val-a' );
    });

    it( 'sets another user parameter', async function() {
        const result = await saaslet.user.set( 'key-b', 'val-b' );
        assert.equal( result.status, 200 );
    });

    it( 'retrieves all', async function() {
        const result = await saaslet.user.getAll();
        assert.deepEqual( result, {
            'key-a': 'val-a',
            'key-b': 'val-b'
        });
    });

    it( 'changes the email', async function() {
        const emailBefore = (await saaslet.user.getInfo()).email;
        const result = await saaslet.user.changeEmail( userAEmailNew, 'password-a' );
        const emailAfter = (await saaslet.user.getInfo()).email;
        assert.equal( result.status, 200 );
        assert.notEqual( emailBefore, emailAfter );
        assert.equal( emailAfter, userAEmailNew );
    });

    it( 'logs out and attempts to log in with old email', async function() {
        assert.equal( (await saaslet.user.logout()).status, 200 );
        assert.equal( (await saaslet.user.isLoggedIn()), false );
        var errorWasThrown = false;
        try{ 
            await saaslet.user.login( userAEmail, 'password-a' );
        } catch( e ) {
            errorWasThrown = true;
            assert.equal( e.status, 404 );
            assert.equal( e.data.error, 'not found' );
        }
        
        assert.isTrue( errorWasThrown, true );
    });

    it( 'successfully logs in with new email', async function() {
        assert.isFalse( await saaslet.user.isLoggedIn() );
        assert.equal( (await saaslet.user.login( userAEmailNew, 'password-a' ) ).status, 200 );
        assert.isTrue( await saaslet.user.isLoggedIn() );
    });

    it( 'changes password and fails to log in with old password', async function() {
        assert.equal( (await saaslet.user.changePassword( 'password-a', 'password-b' ) ).status, 200 );
        assert.equal( (await saaslet.user.logout()).status, 200 );

        var errorWasThrown = false;
        try{ 
            await saaslet.user.login( userAEmail, 'password-a' );
        } catch( e ) {
            errorWasThrown = true;
            assert.equal( e.status, 404 );
            assert.equal( e.data.error, 'not found' );
        }
        
        assert.isTrue( errorWasThrown, true );
    });

    it( 'successfully logs in with new password', async function() {
        assert.isFalse( await saaslet.user.isLoggedIn() );
        assert.equal( (await saaslet.user.login( userAEmailNew, 'password-b' ) ).status, 200 );
        assert.isTrue( await saaslet.user.isLoggedIn() );
    });
});
