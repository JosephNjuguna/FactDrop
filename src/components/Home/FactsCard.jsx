import { useState } from "react";

function FactCard({ fact }) {
    const [like, setLikes] = useState("");

    function handleLikes(id) {
        setLikes(id);
        //once user clicks the like button,
        //i am supposed to send it to the db
        //first we check if the same fact has been liked before
        //if it has been liked before then we just add user email to the list
        //if it hasnt been liked then we add it to the facts collection with the 
        //id from the api as its unique id
        //then update the ui as liked. 
        //make it dissapear then load new fact an load at the bottom of the existing facts 
        //so it becomes an infinite load of facts(doom scrolling) 
        console.log("this post has been liked : ", id);
    }

    return (
        <div>
            <p>category: {fact.category}</p>
            <p>fact : {fact.text}</p>
            <button onClick={() => handleLikes(fact.id)}>like</button>
        </div>
    )
}

export default FactCard;