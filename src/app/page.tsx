import { Nav } from "@/components/Nav";
import { SmoothScroll } from "@/components/SmoothScroll";
import { SceneMount } from "@/components/scene/SceneMount";
import {
  Exterior,
  Intelligence,
  Interior,
  Performance,
  Reveal,
  Showroom,
  Studio,
} from "@/components/sections/Story";
import { Offstage } from "@/components/sections/Offstage";
import { CaseStudy } from "@/components/sections/CaseStudy";
import { Footer } from "@/components/sections/Footer";

export default function Page() {
  return (
    <>
      <SmoothScroll />
      <SceneMount />
      <Nav />
      <main className="relative z-10">
        <Reveal />
        <Exterior />
        <Performance />
        <Intelligence />
        <Interior />
        <Studio />
        <Showroom />
        <Offstage>
          <CaseStudy />
          <Footer />
        </Offstage>
      </main>
    </>
  );
}
