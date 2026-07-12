"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLogoutMutation } from "@/store/api/authApi";
import {
  SearchIcon,
  HomeIcon,
  FriendRequestIcon,
  BellIcon,
  ChatIcon,
  LogoutIcon,
} from "@/components/icons";

export function MobileNav() {
  const [logout] = useLogoutMutation();
  const router = useRouter();

  async function onLogout() {
    try {
      await logout().unwrap();
    } catch {
      /* drop the client session regardless */
    }
    router.replace("/login");
  }

  return (
    <>
      {/* Fixed top bar (logo + search) */}
      <div className="_header_mobile_menu">
        <div className="_header_mobile_menu_wrap">
          <div className="container">
            <div className="row">
              <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                <div className="_header_mobile_menu_top_inner">
                  <div className="_header_mobile_menu_logo">
                    <Link href="/feed">
                      <img
                        src="/images/logo.svg"
                        alt="Buddy Script"
                        className="_nav_logo"
                      />
                    </Link>
                  </div>
                  <div className="_header_mobile_menu_right">
                    <form
                      className="_header_form_grp"
                      onSubmit={(e) => e.preventDefault()}
                    >
                      <span className="_header_mobile_search">
                        <SearchIcon />
                      </span>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom navigation */}
      <div className="_mobile_navigation_bottom_wrapper">
        <div className="_mobile_navigation_bottom_wrap">
          <div className="container">
            <div className="row">
              <div className="col-xl-12 col-lg-12 col-md-12">
                <ul className="_mobile_navigation_bottom_list">
                  <li className="_mobile_navigation_bottom_item">
                    <Link
                      href="/feed"
                      className="_mobile_navigation_bottom_link _mobile_navigation_bottom_link_active"
                      aria-label="Home"
                    >
                      <HomeIcon />
                    </Link>
                  </li>
                  <li className="_mobile_navigation_bottom_item">
                    <Link
                      href="/feed"
                      className="_mobile_navigation_bottom_link"
                      aria-label="Friend requests"
                    >
                      <FriendRequestIcon />
                    </Link>
                  </li>
                  <li className="_mobile_navigation_bottom_item">
                    <Link
                      href="/feed"
                      className="_mobile_navigation_bottom_link"
                      aria-label="Notifications"
                    >
                      <BellIcon />
                    </Link>
                  </li>
                  <li className="_mobile_navigation_bottom_item">
                    <Link
                      href="/feed"
                      className="_mobile_navigation_bottom_link"
                      aria-label="Messages"
                    >
                      <ChatIcon />
                    </Link>
                  </li>
                  <li className="_mobile_navigation_bottom_item">
                    <button
                      type="button"
                      className="_mobile_navigation_bottom_link border-0 bg-transparent"
                      onClick={onLogout}
                      aria-label="Log out"
                    >
                      <LogoutIcon />
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
