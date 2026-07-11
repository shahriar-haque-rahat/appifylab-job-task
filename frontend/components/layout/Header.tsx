"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/authSlice";
import { useLogoutMutation } from "@/store/api/authApi";
import { Avatar } from "@/components/ui/Avatar";
import {
  SearchIcon,
  HomeIcon,
  ChevronDownIcon,
  LogoutIcon,
} from "@/components/icons";
import { fullName } from "@/lib/format";

// Converted from the feed.html header (logo + search + nav + profile menu).
// The profile dropdown owns the Log Out action; other nav items are decorative
// per the brief ("focus only on the main functionality of the feed").
export function Header() {
  const user = useAppSelector(selectAuthUser);
  const [logout, { isLoading }] = useLogoutMutation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function onLogout() {
    setOpen(false);
    try {
      await logout().unwrap();
    } catch {
      /* even if it fails server-side, drop the client session */
    }
    router.replace("/login");
  }

  const name = user ? fullName(user) : "Guest";

  return (
    <nav className="navbar navbar-expand-lg navbar-light _header_nav _padd_t10">
      <div className="container _custom_container">
        <div className="_logo_wrap">
          <Link className="navbar-brand" href="/feed">
            <img src="/images/logo.svg" alt="Buddy Script" className="_nav_logo" />
          </Link>
        </div>

        <div className="_header_form ms-auto">
          <form className="_header_form_grp" onSubmit={(e) => e.preventDefault()}>
            <SearchIcon className="_header_form_svg" />
            <input
              className="form-control me-2 _inpt1"
              type="search"
              placeholder="input search text"
              aria-label="Search"
            />
          </form>
        </div>

        <ul className="navbar-nav mb-2 mb-lg-0 _header_nav_list ms-auto _mar_r8">
          <li className="nav-item _header_nav_item">
            <Link
              className="nav-link _header_nav_link_active _header_nav_link"
              href="/feed"
              aria-current="page"
            >
              <HomeIcon />
            </Link>
          </li>
        </ul>

        <div className="_header_nav_profile relative" ref={profileRef}>
          <div className="_header_nav_profile_image">
            <Avatar
              src={user?.avatarUrl}
              alt={name}
              className="_nav_profile_img"
            />
          </div>
          <div
            className="_header_nav_dropdown cursor-pointer"
            onClick={() => setOpen((o) => !o)}
          >
            <p className="_header_nav_para">{name}</p>
            <button
              type="button"
              className="_header_nav_dropdown_btn _dropdown_toggle"
              aria-label="Account menu"
            >
              <ChevronDownIcon />
            </button>
          </div>

          <div className={`_nav_profile_dropdown _profile_dropdown${open ? " show" : ""}`}>
            <div className="_nav_profile_dropdown_info">
              <div className="_nav_profile_dropdown_image">
                <Avatar src={user?.avatarUrl} alt={name} className="_nav_drop_img" />
              </div>
              <div className="_nav_profile_dropdown_info_txt">
                <h4 className="_nav_dropdown_title">{name}</h4>
                <span className="_nav_drop_profile">{user?.email}</span>
              </div>
            </div>
            <hr />
            <ul className="_nav_dropdown_list">
              <li className="_nav_dropdown_list_item">
                <button
                  type="button"
                  className="_nav_dropdown_link w-full cursor-pointer border-0 bg-transparent text-left"
                  onClick={onLogout}
                  disabled={isLoading}
                >
                  <div className="_nav_drop_info">
                    <span>
                      <LogoutIcon />
                    </span>{" "}
                    {isLoading ? "Logging out…" : "Log Out"}
                  </div>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
