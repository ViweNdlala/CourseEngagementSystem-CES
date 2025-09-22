// src/student/__tests__/StudentPoints.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import StudentPoints from "../pages/Points";
import { UserProvider } from "../../contexts/UserContext"; // your context

// helper to wrap component in UserProvider
const renderWithUser = (ui, { user = { id: 1, name: "Test Student" } } = {}) => {
  return render(
    <UserProvider value={{ user }}>
      {ui}
    </UserProvider>
  );
};

describe("StudentPoints Component (Simple Tests)", () => {
  test("renders request points button and textarea", () => {
    renderWithUser(<StudentPoints course={{ id: 1 }} />);
    
    expect(
      screen.getByRole("button", { name: /Request Points/i })
    ).toBeInTheDocument();
    
    expect(
      screen.getByPlaceholderText(
        /Briefly describe your question or answer/i
      )
    ).toBeInTheDocument();
  });

  test("shows message when no user or course is provided", () => {
    renderWithUser(<StudentPoints course={null} />);
    
    fireEvent.click(screen.getByRole("button", { name: /Request Points/i }));
    
    expect(screen.getByText(/Missing user or course/i)).toBeInTheDocument();
  });
});

