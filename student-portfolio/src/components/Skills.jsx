function Skills({ skillList }) {

    return (

        <>

            <h2>Skills</h2>

            <ul className="skill-list">

                {skillList.map((skill) => (

                    <li key={skill}>{skill}</li>

                ))}

            </ul>

        </>

    );

}

export default Skills;