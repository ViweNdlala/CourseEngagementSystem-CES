import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StudentPoints from "../student/pages/Points";
import { UserProvider } from "../contexts/UserContext";
import { CourseProvider } from "../contexts/CourseContext";



const AllProviders = ({ children }) => (
  <UserProvider>
    <CourseProvider>{children}</CourseProvider>
  </UserProvider>
);

const renderWithProviders = (ui) => render(<AllProviders>{ui}</AllProviders>);

describe("StudentPoints Page", () => {
  it("renders headings and form inputs", () => {
    renderWithProviders(<StudentPoints />);

    expect(
      screen.getByRole("heading", { name: /Request Points/i })
    ).toBeInTheDocument();

    // make queries more specific
    expect(screen.getByText(/Question \(\+10\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Answer \(\+20\)/i)).toBeInTheDocument();
  });

  

  it("submits a request and updates latest request", async () => {
    renderWithProviders(<StudentPoints />);

    fireEvent.change(screen.getByPlaceholderText(/Briefly describe/i), {
      target: { value: "My test question" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Request Points/i }));

    await waitFor(() => {
      expect(screen.getByText(/My test question/i)).toBeInTheDocument();
    });
  });
});

