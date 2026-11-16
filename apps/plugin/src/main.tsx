import "@framer/plugin/framer.css"
import "./App.css"

import { framer } from "@framer/plugin"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"

void framer.showUI({ position: "top right", width: 320, height: 480 })

const project = await framer.getProjectInfo()

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App projectId={project.id} />
    </StrictMode>
)
