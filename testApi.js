async function testApi() {
    try {
        const loginRes = await fetch('http://localhost:5000/api/v1/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'priya',
                password: '123' 
            })
        });
        
        const setCookie = loginRes.headers.get('set-cookie');
        console.log("Cookie:", setCookie);
        if(!setCookie) {
            console.log("Login failed", await loginRes.text());
            return;
        }
        // Extract token
        const cookieStr = setCookie.split(';')[0];
        
        const usersRes = await fetch('http://localhost:5000/api/v1/user', {
            headers: {
                Cookie: cookieStr
            }
        });
        const users = await usersRes.json();
        console.log("Other users length:", users.length);
        console.log("Other users:", users);
    } catch (error) {
        console.error("Error:", error);
    }
}
testApi();
