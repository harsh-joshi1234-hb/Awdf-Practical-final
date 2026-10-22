import About from "./About";
import Skills from "./Skills";

function Home() {
  const skills = ["HTML", "CSS", "JavaScript", "React", "Node.js", "Python"];

  return (
    <>
      <div className="card">
        <About />
      </div>

      <div className="card">
        <Skills skillList={skills} />
      </div>
    </>
  );
}

export default Home;
