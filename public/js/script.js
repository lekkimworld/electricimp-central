const postStateMessage = (action, data) => {
    // create payload
    const payload = Object.assign({
        action
    }, data);

    // post to update state
    return fetch(document.location.href + "api/action", {
        "method": "post", 
        "headers": {
            "Content-Type": "application/json"
        },
        "body": JSON.stringify(payload)
    }).then(res => res.json()).then(data => {
        console.log(`/api/action returned status = ${data.status}`);
        if (data.status === "ok") {
            return Promise.resolve(data);
        } else {
            return Promise.reject(Error(data.error));
        }
    })
}
const addImpActionListeners = (selector, callback) => {
    document.querySelectorAll(selector).forEach(node => {
        if (node) {
            const action = node.getAttribute("custom-action");
            if (action) {
                node.addEventListener("click", (event) => {
                    // prevent default event
                    event.preventDefault = true;
                    postStateMessage(action).then(data => {
                        callback(undefined, data);
                    }).catch(err => {
                        callback(err, undefined);
                    });
                })
            }
        }
    })
}
window.addEventListener("load", () => {
    document.querySelectorAll("button.btn").forEach(node => {
        const action = node.getAttribute("action");
        if (action) {
            node.addEventListener("click", (event) => {
                // prevent default event
                event.preventDefault = true;
                postStateMessage(action);
            })
        }
    });    
})
