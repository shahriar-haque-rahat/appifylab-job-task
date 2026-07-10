import { AuthGuard } from "@/components/auth/AuthGuard";
import { Header } from "@/components/layout/Header";
import { Feed } from "@/components/feed/Feed";

// Protected feed page. Layout mirrors feed.html's 3-column shell; the center
// column carries the required functionality. Side columns are intentionally
// minimal (the brief says to focus on the feed, not the decorative widgets).
export default function FeedPage() {
  return (
    <AuthGuard>
      <div className="_layout _layout_main_wrapper">
        <div className="_main_layout">
          <Header />
          <div className="container _custom_container">
            <div className="_layout_inner_wrap">
              <div className="row">
                <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
                  <aside className="_layout_left_sidebar_wrap" />
                </div>
                <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">
                  <div className="_layout_middle_wrap">
                    <div className="_layout_middle_inner">
                      <Feed />
                    </div>
                  </div>
                </div>
                <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
                  <aside className="_layout_right_sidebar_wrap" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
