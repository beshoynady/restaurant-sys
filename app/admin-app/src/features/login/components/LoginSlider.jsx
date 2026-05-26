import restaurant from "../../../assets/images/smart-restaurant.jpg";
import menu from "../../../assets/images/e-menu.jpg";
import pos from "../../../assets/images/pos.jpg";

const slides = [
  {
    image: restaurant,
    title: "Smart Restaurant Management",
    description:
      "Manage your restaurant professionally.",
  },

  {
    image: menu,
    title: "Digital Menu",
    description:
      "Update your menu instantly.",
  },

  {
    image: pos,
    title: "POS & Analytics",
    description:
      "Monitor sales and reports in real time.",
  },
];

export default function LoginSlider() {
  return (
    <div className="login-slider">

      {slides.map((slide, index) => (
        <div className="slider-card" key={index}>

          <img
            src={slide.image}
            alt={slide.title}
          />

          <div className="slider-overlay">
            <h2>{slide.title}</h2>
            <p>{slide.description}</p>
          </div>

        </div>
      ))}

    </div>
  );
}