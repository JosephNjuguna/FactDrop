import { useEffect, useState } from "react";
import Facts from "./Home/Facts";

function Home() {
    const [facts, setFacts] = useState([]);
    const [factsError, setFactsError] = useState("");

    useEffect(() => {
        const fetchfacts = async () => {
            await fetch('https://factfacts.com/api.php?count=5')
                .then((res) => {
                    if (!res.ok) {
                        setFactsError('Failed to fetch facts data')
                        throw new Error();
                    }
                    return res.json();
                })
                .then((data) => {
                    setFacts(data.facts);
                    console.log(data.facts);
                })
                .catch((err) => {
                    setFactsError('Fetching Facts failed.')
                    console.log(err.message);
                });
        }
        fetchfacts()
    }, []);

    return (
        <>
            <Facts facts={facts} />
            <p>this is home {factsError}</p>
        </>
    )
}
export default Home;