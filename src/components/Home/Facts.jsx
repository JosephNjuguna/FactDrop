import { useState } from "react";
import FactCard from "./FactsCard";

function Facts({ facts }) {

    return (
        <div className="FactsList">
            <ul className="Facts">
                {facts.map((fact) => (
                    <FactCard key={fact.id} fact={fact}/>
                ))}
            </ul>
        </div>
    );
}
export default Facts