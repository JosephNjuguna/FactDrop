import { useEffect, useState } from "react";

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
                    setFacts(data);
                    console.log(data);
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
            <p>this is home {factsError}</p>
        </>
    )
}
export default Home;